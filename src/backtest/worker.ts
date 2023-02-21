// Access the workerData by requiring it.
import {format} from 'date-fns';
import numeral from 'numeral';

import {loadTickForDate} from '../utils/tick-storage';

import {loadStrategy} from '../utils/module';
import {mergeSortedArrays} from '../utils/data-structures';
import {createDataProvider} from '../utils/data-provider';
import {getTimes} from '../utils/dates';
import {indicatorUpdateWrapper} from '../utils/indicators';

import {initTracker, handleTrackerTick} from '../utils/tracker';

import {
  getPreMarketOpen,
  getMarketOpen,
  getMarketClose,
  getMarketState,
  initMarket,
  updateMarket,
} from '../utils/market';

import {
  StoredTick,
  LoggerCallback,
  Tracker,
  OrderSpecification,
  Profile,
  TickFileType,
  MaximumBarCount,
} from '../core';

import {
  initBroker,
  placeOrder,
  handleBrokerTick,
  hasOpenOrders,
  hasOpenPosition,
  getOpenPosition,
  getPositionSize,
  closePosition,
} from './broker';

import Env from '../utils/env';

import {loadTrackerBars} from '../utils/db';

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
    type: 'backtest',
  });

  await dataProvider.init({
    workerIndex,
  });

  // Make sure the module exists
  const Strategy = await loadStrategy(
    Env.getUserPath(`./test-strategies/${profile.strategy.name}.ts`),
  );

  if (!Strategy) {
    throw new BacktestWorkerError('strategy-not-found');
  }

  const symbols = Array.from(new Set([symbol, ...Strategy.extraSymbols]));

  const start = Date.now();

  const preMarketOpen = getPreMarketOpen(date);
  const marketOpen = getMarketOpen(date);
  const marketClose = getMarketClose(date);

  log(
    `Loading tick data for ${symbols.join(', ')} on ${format(
      date,
      'yyyy-MM-dd',
    )}`,
  );

  const market = initMarket(date, preMarketOpen, marketOpen, marketClose);

  const brokerState = initBroker({
    getMarketTime: () => {
      return market.current.dt;
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
      const tracker = trackers[symbol];

      tracker.bars = await loadTrackerBars(symbol, date, MaximumBarCount);

      // WARNING: this is not the 'true' close but the close of the last daily
      // bar whcih isn't the same... IB don't appear to give us a way of getting
      // historic prev-close values so we have to esitmate in backtests.

      // -1 is today and -2 is previous
      const prevClose = tracker.bars.daily.at(-2)?.close;

      if (prevClose) {
        handleTrackerTick({
          data: tracker,
          tick: {
            type: 'CLOSE',
            value: prevClose,
            size: 0,
            time: market.current.unix,
          },
          marketOpen,
          marketClose,
        });
      }
    }),
  );

  const strategy = Strategy.factory({
    symbol,
    log,
    trackers,
    tracker: trackers[symbol],
    market,
    broker: {
      placeOrder: (spec: OrderSpecification) =>
        placeOrder(brokerState, symbol, spec),
      hasOpenOrders: () => hasOpenOrders(brokerState, symbol),
      getPositionSize: () => getPositionSize(brokerState, symbol),
      closePosition: (reason: string | null) =>
        closePosition(brokerState, symbol, reason),
      hasOpenPosition: () => hasOpenPosition(brokerState, symbol),
      getOpenPosition: () => getOpenPosition(brokerState, symbol),
      orders: brokerState.orders,
      positions: brokerState.positions,
    },
  });

  const indicators = strategy.indicators.map(indicatorUpdateWrapper);

  // Load the main symbol data
  const symbolData = await Promise.all(
    symbols.map(
      async symbol =>
        await loadTickForDate(symbol, market.current.dt, TickFileType.Merged),
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

    updateMarket(market, tick.dateTime);

    const tracker = trackers[tick.symbol];

    // update the tracker data
    handleTrackerTick({
      data: tracker,
      tick,
      marketOpen,
      marketClose,
    });

    if (tick.type === 'TRADE' && Env.DISABLE_BACKTEST_BIDASK === '1') {
      // calculate the bid/ask spread if we don't ahve data, this method isn't very good
      // because the spread can change from symbol to symbol and from minute to minute
      // ideally we should use quote data form Polygon but that's $200/month!
      //
      // I don't think that the type of testing that I will be doing will be a huge issue
      // but it's something to keep an eye on

      const spread = 0.02 / 2;

      handleTrackerTick({
        data: tracker,
        tick: {...tick, type: 'BID', value: tick.value - spread, size: 0},
        marketOpen,
        marketClose,
      });

      handleTrackerTick({
        data: tracker,
        tick: {...tick, type: 'ASK', value: tick.value + spread, size: 0},
        marketOpen,
        marketClose,
      });
    }

    // update the indicators
    indicators.forEach(indicator => indicator.update());

    // if we are in a setup or we have open orders then call handleTick on the strategy
    if (
      strategy.isSetup({
        symbol,
        tracker: trackers[symbol],
        trackers,
        log,
        marketTime: getTimes(market.current.unix),
        marketOpen: getTimes(marketOpen),
        marketClose: getTimes(marketClose),
        marketState: getMarketState(
          market.current.unix,
          preMarketOpen,
          marketOpen,
          marketClose,
        ),
      }) ||
      hasOpenOrders(brokerState, symbol)
    ) {
      // update broker, open orders, etc
      handleBrokerTick(brokerState, tick.symbol, tracker, {
        commissionPerOrder: profile.commissionPerOrder,
        orderExecutionDelayMs: 1000,
      });

      // If this is an update for our symbol then call the strategy
      if (tick.symbol === symbol) {
        strategy.handleTick(tick);
      }
    }
  });

  log(`Finished ${symbol} in ${numeral(Date.now() - start).format(',')}ms`);

  // Give the log a change to write to stdout
  await new Promise(resolve => setTimeout(resolve, 0));

  return brokerState.positions;
}
