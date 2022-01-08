import {format, startOfDay, fromUnixTime} from 'date-fns';

type Bar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const Periods = {
  m1: 1,
  m5: 5,
  h1: 60,
  daily: 1440,
};

const periods = [Periods.m1, Periods.m5, Periods.daily];

export type Bars = Record<number, Array<Bar>>;

export type Tracker = {
  open: number;
  high: number;
  low: number;
  last: number;
  volume: number;
  bid: number;
  ask: number;
  retraceFromHigh: number;
  retraceFromLow: number;
  preMarketHigh: number;
  preMarketLow: number;
  preMarketVolume: number;
  bars: Bars;
};

type TickType = 'BID' | 'ASK' | 'TRADE';

export const barLength = 250;

export function initTracker(): Tracker {
  return {
    open: 0,
    high: 0,
    low: 0,
    last: 0,
    volume: 0,
    bid: 0,
    ask: 0,
    retraceFromHigh: 0,
    retraceFromLow: 0,
    preMarketHigh: 0,
    preMarketLow: 0,
    preMarketVolume: 0,
    bars: {},
  };
}

export const getBarTime = (period: number, marketTime: number) => {
  const time = fromUnixTime(marketTime);
  if (period === Periods.daily) {
    return startOfDay(time);
  }
  const duration = period * 60;
  return fromUnixTime(Math.floor(+marketTime / +duration) * +duration);
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
  period: number;
  time: number;
}) => {
  const barTime = getBarTime(period, time);
  const marketTime = format(barTime, 'yyyy-MM-dd hh:mm:ss');

  console.log('XXX', barTime, marketTime);

  bars[period] = bars[period] || [];
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
  while (barsToUpdate.length > barLength) {
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

export function updateTracker({
  data,
  time,
  isPreMarket,
  isMarketOpen,
  type,
  size,
  value,
}: {
  data: Tracker;
  time: number;
  isPreMarket: boolean;
  isMarketOpen: boolean;
  type: TickType;
  size: number;
  value: number;
}): void {
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

    default:
      break;
  }
}
