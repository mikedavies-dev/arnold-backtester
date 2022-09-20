// Access the workerData by requiring it.
import {format} from 'date-fns';
import numeral from 'numeral';
import path from 'path';

import {loadTickForSymbolAndDate} from '../utils/tick-storage';
import {loadStrategy} from '../utils/module';
import {mergeSortedArrays} from '../utils/data-structures';
import {initTracker, handleTrackerTick} from '../utils/tracker';
import {
  getPreMarketOpen,
  getMarketOpen,
  getMarketClose,
  getMarketState,
} from '../utils/market';
import {
  Tick,
  LoggerCallback,
  Tracker,
  OrderSpecification,
  Profile,
  TickFileType,
} from '../core';
import {
  initBroker,
  placeOrder,
  handleBrokerTick,
  hasOpenOrders,
  getPositionSize,
} from './broker';

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

function marketSortFn(row1: Tick, row2: Tick) {
  // Sort on both index and time so we don't loose th original order
  // if we have multiple values per second
  const val1 = row1.time * 1000000 + row1.index;
  const val2 = row2.time * 1000000 + row1.index;

  return val1 - val2;
}

async function loadJsOrTsStrategy(strategy: string) {
  return (
    (await loadStrategy(
      path.join(process.cwd(), `./strategies/${strategy}.js`),
    )) ||
    (await loadStrategy(
      path.join(process.cwd(), `./src/strategies/${strategy}.ts`),
    ))
  );
}

export async function runBacktest({
  profile,
  symbol,
  date,
  log,
}: {
  profile: Profile;
  symbol: string;
  date: Date;
  log: LoggerCallback;
}) {
  // Make sure the module exists
  const strategy = await loadJsOrTsStrategy(profile.strategy.name);

  if (!strategy) {
    throw new BacktestWorkerError('strategy-not-found');
  }

  const symbols = Array.from(new Set([symbol, ...strategy.extraSymbols]));

  const start = Date.now();

  /*
  Main loop:
  1. Iterate minute bars starting at tradeFrom and ending at tradeTo
  2. If IsInPlay, load tick data for the current N minute window, otherwise continue to the next minute
  3. Iterate ticks in the window, when we move to next minute in tick data increment the minute bar index
  4. Each minute call IsInPlay to see if we are still in play. If we are not in play and we don't have any open orders then stop processing ticks
  */

  log(
    `Loading TS data for ${symbols.join(', ')} on ${format(
      date,
      'yyyy-MM-dd',
    )}`,
  );

  // Load the main symbol data
  const symbolData = await Promise.all(
    symbols.map(
      async symbol =>
        await loadTickForSymbolAndDate(symbol, date, TickFileType.Merged),
    ),
  );

  if (symbolData.some(data => !data)) {
    throw new BacktestWorkerError('no-symbol-data');
  }

  // Merge all the data
  const marketData = mergeSortedArrays<Tick>(
    symbolData as Array<Tick[]>,
    marketSortFn,
  );

  // Iterate the data..
  log(
    `Loaded ${numeral(marketData.length).format(
      '0,0',
    )} ticks for ${symbol} and ${strategy.extraSymbols.join(', ')}`,
  );

  const trackers = symbols.reduce(
    (acc, symbol) => ({
      ...acc,
      [symbol]: initTracker(),
    }),
    {} as Record<string, Tracker>,
  );

  const preMarketOpen = getPreMarketOpen(date);
  const marketOpen = getMarketOpen(date);
  const marketClose = getMarketClose(date);

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
    commissionPerOrder: profile.commissionPerOrder,
  });

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
          placeOrder: (spec: OrderSpecification) =>
            placeOrder(brokerState, spec),
          hasOpenOrders: (symbol: string) => hasOpenOrders(brokerState, symbol),
          getPositionSize: (symbol: string) =>
            getPositionSize(brokerState, symbol),
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
    handleBrokerTick(brokerState, tick.symbol, tracker);
  });

  log(`Finished ${symbol} in ${numeral(Date.now() - start).format(',')}ms`);

  return brokerState.positions;
}
