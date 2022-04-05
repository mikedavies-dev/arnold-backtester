import {format, startOfDay, fromUnixTime} from 'date-fns';
import {Tick} from '../core';

export type Bar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// export type Bars = Record<number, Array<Bar>>;
export type Bars = {
  m1: Array<Bar>;
  m5: Array<Bar>;
  daily: Array<Bar>;
};

type BarPeriod = keyof Bars;

export const Periods = {
  m1: 1,
  m5: 5,
  daily: 1440,
};

const periods: Array<BarPeriod> = ['m1', 'm5', 'daily'];

export type Tracker = {
  open: number;
  high: number;
  low: number;
  last: number;
  volume: number;
  bid: number;
  ask: number;
  preMarketHigh: number;
  preMarketLow: number;
  preMarketVolume: number;
  bars: Bars;
};

export const MaximumBarCount = 250;

export function initTracker(): Tracker {
  return {
    open: 0,
    high: 0,
    low: 0,
    last: 0,
    volume: 0,
    bid: 0,
    ask: 0,
    preMarketHigh: 0,
    preMarketLow: 0,
    preMarketVolume: 0,
    bars: {
      m1: [],
      m5: [],
      daily: [],
    },
  };
}

export const formatBarTime = (period: number, marketTime: number): string => {
  const duration = period * 60;

  const date =
    period === Periods.daily
      ? startOfDay(fromUnixTime(marketTime))
      : fromUnixTime(Math.floor(+marketTime / +duration) * +duration);

  return format(date, 'yyyy-MM-dd HH:mm');
};

export const updateDataBar = ({
  bars,
  price,
  volume,
  period,
  time,
}: {
  bars: Bars;
  price: number;
  volume: number;
  period: BarPeriod;
  time: number;
}) => {
  const marketTime = formatBarTime(Periods[period], time);

  const barsToUpdate = bars[period];

  if (
    barsToUpdate.length === 0 ||
    barsToUpdate[barsToUpdate.length - 1].time !== marketTime
  ) {
    barsToUpdate.push({
      time: marketTime,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
    });
  }

  // remove the last items
  while (barsToUpdate.length > MaximumBarCount) {
    barsToUpdate.shift();
  }

  // get the last bar
  const bar = barsToUpdate[barsToUpdate.length - 1];

  // update volume
  if (volume) {
    bar.volume += volume;
  }

  // update price info
  if (price) {
    bar.close = price;
    if (price > bar.high) {
      bar.high = price;
    }
    if (price < bar.low) {
      bar.low = price;
    }
  }
};

export function handleTrackerTick({
  data,
  tick,
  marketOpen,
  marketClose,
}: {
  data: Tracker;
  tick: Tick;
  marketOpen: number;
  marketClose: number;
}): void {
  const {time, type, value, size} = tick;
  const isMarketOpen = time >= marketOpen && time <= marketClose;
  const isPreMarket = time < marketOpen;

  // update bar data
  switch (type) {
    case 'ASK':
      data.ask = value;
      break;

    case 'BID':
      data.bid = value;
      break;

    case 'TRADE':
      data.volume += size;
      data.last = value;

      // Pre-market data
      if (isPreMarket) {
        if (!data.preMarketHigh || value > data.preMarketHigh) {
          data.preMarketHigh = value;
        }

        if (!data.preMarketLow || value < data.preMarketLow) {
          data.preMarketLow = value;
        }

        data.preMarketVolume += size;
      }

      // Set open/high/low levels
      if (isMarketOpen) {
        if (!data.open) {
          data.open = value;
        }

        if (!data.high || value > data.high) {
          data.high = value;
        }

        if (!data.low || value < data.low) {
          data.low = value;
        }
      }

      periods.forEach(period =>
        updateDataBar({
          bars: data.bars,
          price: value,
          volume: size,
          period,
          time,
        }),
      );
      break;
  }
}
