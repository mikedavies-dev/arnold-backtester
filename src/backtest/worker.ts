// Access the workerData by requiring it.
import {format, fromUnixTime} from 'date-fns';
import numeral from 'numeral';

import {
  loadTickForMinute,
  ensureTickDataIsAvailable,
} from '../utils/tick-storage';
import {loadStrategy} from '../utils/module';
import {mergeSortedArrays} from '../utils/data-structures';
import {createDataProvider} from '../utils/data-provider';

import {
  initTracker,
  handleTrackerTick,
  handleTrackerMinuteBar,
  handleMissingBar,
} from '../utils/tracker';

import {
  getPreMarketOpen,
  getMarketOpen,
  getMarketClose,
  getMarketState,
} from '../utils/market';

import {
  StoredTick,
  LoggerCallback,
  Tracker,
  OrderSpecification,
  Profile,
  TickFileType,
  MaximumBarCount,
  Periods,
  Bar,
} from '../core';

import {
  initBroker,
  placeOrder,
  handleBrokerTick,
  hasOpenOrders,
  getPositionSize,
  closePosition,
} from './broker';

import Env from '../utils/env';

import {loadMinuteDataForDate, loadTrackerBars} from '../utils/db';
import {formatBarTime} from '../utils/bars';

export type BackTestWorkerErrorCode =
  | 'strategy-not-found'
  | 'no-symbol-data'
  | 'invalid-symbol-data'
  | 'unknown';

export class BacktestWorkerError extends Error {
  constructor(public code: BackTestWorkerErrorCode) {
    super(code);
    Object.setPrototypeOf(this, BacktestWorkerError.prototype);
  }
}

function marketSortFn(row1: StoredTick, row2: StoredTick) {
  // Sort on both index and time so we don't loose th original order
  // if we have multiple values per second
  const val1 = row1.time * 1000000 + row1.index;
  const val2 = row2.time * 1000000 + row1.index;

  return val1 - val2;
}

export async function runBacktest({
  profile,
  symbol,
  date,
  log,
  workerIndex = 0,
}: {
  profile: Profile;
  symbol: string;
  date: Date;
  log: LoggerCallback;
  workerIndex: number;
}) {
  // Create the data provider so we can download tick data
  const dataProvider = createDataProvider({
    log,
  });

  await dataProvider.init({
    workerIndex,
  });

  // Make sure the module exists
  const strategy = await loadStrategy(
    Env.getUserPath(`./test-strategies/${profile.strategy.name}.ts`),
  );

  if (!strategy) {
    throw new BacktestWorkerError('strategy-not-found');
  }

  const symbols = Array.from(new Set([symbol, ...strategy.extraSymbols]));

  const start = Date.now();

  const preMarketOpen = getPreMarketOpen(date);
  const marketOpen = getMarketOpen(date);
  const marketClose = getMarketClose(date);

  log(
    `Loading minute data for ${symbols.join(', ')} on ${format(
      date,
      'yyyy-MM-dd',
    )}`,
  );

  const currentMarketTime: {
    current: Date;
  } = {
    current: date,
  };

  const brokerState = initBroker({
    getMarketTime: () => {
      return currentMarketTime.current;
    },
    initialBalance: profile.initialBalance,
  });

  // Load trackers for all symbols using data from the db
  const trackers = symbols.reduce(
    (acc, symbol) => ({
      ...acc,
      [symbol]: initTracker(),
    }),
    {} as Record<string, Tracker>,
  );

  // Pre-load data into the trackers
  await Promise.all(
    symbols.map(async symbol => {
      trackers[symbol].bars = await loadTrackerBars(
        symbol,
        date,
        MaximumBarCount,
      );
    }),
  );

  const minuteData = (
    await Promise.all(
      symbols.map(async symbol => {
        return {
          data: await loadMinuteDataForDate(symbol, date),
          symbol,
        };
      }),
    )
  ).reduce((acc, {data, symbol}) => {
    acc[symbol] = data;
    return acc;
  }, {} as Record<string, {[time: string]: Bar}>);

  // Process the bar data
  for (
    let marketTime = getPreMarketOpen(date);
    marketTime <= marketClose;
    marketTime += 60
  ) {
    currentMarketTime.current = fromUnixTime(marketTime);

    const time = formatBarTime(Periods.m1, marketTime);

    // Update the trackers with the current bar data (if we have any)
    symbols.forEach(symbol => {
      const bar = minuteData[symbol][time];

      // If we have the bar data then apply that to the tracker, otherwise
      // update the tracker from the last available bar
      if (bar) {
        handleTrackerMinuteBar({
          data: trackers[symbol],
          bar,
          marketOpen,
          marketClose,
          marketTime,
        });
      } else {
        handleMissingBar({
          data: trackers[symbol],
          marketTime,
          marketOpen,
          marketClose,
        });
      }
    });

    // While we either have open orders or we are in a setup
    while (
      strategy.isSetup({
        symbol,
        tracker: trackers[symbol],
        trackers,
        log,
        marketTime,
        marketOpen,
        marketClose,
      }) ||
      hasOpenOrders(brokerState, symbol)
    ) {
      log(
        `In setup or have open trades at minute ${format(
          marketTime * 1000,
          'yyyy-MM-dd HH:mm:ss',
        )}`,
      );

      // Make sure we have data for this minute
      await ensureTickDataIsAvailable({
        symbols,
        minute: fromUnixTime(marketTime),
        log,
        dataProvider,
      });

      // Load the main symbol data
      const symbolData = await Promise.all(
        symbols.map(
          async symbol =>
            await loadTickForMinute(
              symbol,
              fromUnixTime(marketTime),
              TickFileType.Merged,
            ),
        ),
      );

      // Merge all the data
      const marketData = mergeSortedArrays<StoredTick>(
        symbolData as Array<StoredTick[]>,
        marketSortFn,
      );

      marketData.forEach(tick => {
        if (!trackers[tick.symbol]) {
          throw new BacktestWorkerError('invalid-symbol-data');
        }

        currentMarketTime.current = tick.dateTime;

        const tracker = trackers[tick.symbol];

        const marketState = getMarketState(
          tick.time,
          preMarketOpen,
          marketOpen,
          marketClose,
        );

        // If this is an update for our symbol then call the strategy
        if (tick.symbol === symbol) {
          strategy.handleTick({
            log,
            marketState,
            tick,
            symbol,
            tracker,
            trackers,
            broker: {
              state: brokerState,
              placeOrder: (symbol: string, spec: OrderSpecification) =>
                placeOrder(brokerState, symbol, spec),
              hasOpenOrders: (symbol: string) =>
                hasOpenOrders(brokerState, symbol),
              getPositionSize: (symbol: string) =>
                getPositionSize(brokerState, symbol),
              closePosition: (symbol: string, reason: string | null) =>
                closePosition(brokerState, symbol, reason),
            },
          });
        }

        // Update the tracker data
        handleTrackerTick({
          data: tracker,
          tick,
          marketOpen,
          marketClose,
        });

        // Update broker, open orders, etc
        handleBrokerTick(brokerState, tick.symbol, tracker, {
          commissionPerOrder: profile.commissionPerOrder,
          orderExecutionDelayMs: 1000,
        });
      });

      // Increment the market time 60 seconds (next minute bar)
      marketTime += 60;
    }
  }

  log(`Finished ${symbol} in ${numeral(Date.now() - start).format(',')}ms`);

  // Give the log a change to write to stdout
  await new Promise(resolve => setTimeout(resolve, 0));

  return brokerState.positions;
}
