import {fromUnixTime, parse, getUnixTime, format, addSeconds} from 'date-fns';

import {TickType, Tracker, BrokerState, StoredTick} from '../../core';
import {flow} from 'fp-ts/lib/function';

import {
  createTimeAsDate as createTimeAsDateBase,
  createTimeAsUnix as createTimeAsUnixBase,
} from '../../utils/dates';

import {handleTrackerTick, initTracker} from '../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../utils/market';
import {handleBrokerTick, initBroker} from '../../backtest/broker';

export function createTimeAsUnix(time: string) {
  return createTimeAsUnixBase(time, getTestDate());
}

export function createTimeAsDate(time: string, date = '2022-01-01') {
  return createTimeAsDateBase(time, date, getTestDate());
}

export function createTick({
  type,
  time,
  value,
  size,
}: {
  type: TickType;
  time: number;
  value: number;
  size: number;
}): StoredTick {
  return {
    type,
    time,
    value,
    size,
    dateTime: fromUnixTime(time),
    symbol: 'AAAA',
    index: 0,
  };
}

export function getTestDate() {
  return parse('2022-01-01', 'yyyy-MM-dd', new Date());
}

export type TestTickData = [string, number, number, number, number];

export function updateTestTracker(
  tracker: Tracker,
  state: BrokerState,
  ticks: Array<TestTickData>,
): Date {
  let lastDate: Date | null = null;

  ticks.forEach(tick => {
    const [timeString, bid, ask, price, volume] = tick;

    const time = flow(parse, getUnixTime)(
      timeString,
      'HH:mm:ss',
      getTestDate(),
    );

    const marketOpen = getMarketOpen(fromUnixTime(time));
    const marketClose = getMarketClose(fromUnixTime(time));

    // Update bid
    handleTrackerTick({
      data: tracker,
      tick: createTick({
        type: 'BID',
        time,
        value: bid,
        size: 0,
      }),
      marketOpen,
      marketClose,
    });

    // Update ask
    handleTrackerTick({
      data: tracker,
      tick: createTick({
        type: 'ASK',
        time,
        value: ask,
        size: 0,
      }),
      marketOpen,
      marketClose,
    });

    // Update last trade price/volume
    handleTrackerTick({
      data: tracker,
      tick: createTick({
        type: 'TRADE',
        time,
        value: price,
        size: volume,
      }),
      marketOpen,
      marketClose,
    });

    lastDate = parse(timeString, 'HH:mm:ss', getTestDate());
  });

  if (!lastDate) {
    throw new Error('No ticks provided');
  }

  return lastDate;
}

type Market = {
  broker: BrokerState;
  time: Date;
  tracker: Tracker;
  symbol: string;
};

export function updateMarketDataAndBroker(
  market: Market,
  ticks: Array<TestTickData>,
) {
  market.time = updateTestTracker(market.tracker, market.broker, ticks);

  // Update the broker
  handleBrokerTick(market.broker, market.symbol, market.tracker, {
    orderExecutionDelayMs: 1000,
    commissionPerOrder: 1,
  });
}

export function createMarket(ticks: Array<TestTickData>) {
  if (!ticks.length) {
    throw new Error('No ticks provided');
  }

  const last = ticks[ticks.length - 1];

  const data: Market = {
    broker: initBroker({
      initialBalance: 1000,
      getMarketTime: () => data.time,
    }),
    time: createTimeAsDate(last[0]),
    tracker: initTracker(),
    symbol: 'AAAA',
  };

  // Apply any initialization data
  updateMarketDataAndBroker(data, ticks);

  return data;
}

export function offsetMarketUpdate(
  market: Market,
  value: number,
  precision = 0.05,
  secondsToAdvance = 1,
) {
  const time = addSeconds(market.time, secondsToAdvance);

  updateMarketDataAndBroker(market, [
    [format(time, 'HH:mm:ss'), value - precision, value + precision, value, 0],
  ]);
}
