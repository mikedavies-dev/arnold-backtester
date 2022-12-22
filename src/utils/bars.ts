import {format, startOfDay, fromUnixTime} from 'date-fns';
import {Bar, Bars, BarPeriod, MaximumBarCount, Periods} from '../core';

export const formatBarTime = (period: number, marketTime: number): string => {
  const duration = period * 60;

  const date =
    period === Periods.daily
      ? startOfDay(fromUnixTime(marketTime))
      : fromUnixTime(Math.floor(+marketTime / +duration) * +duration);

  return format(date, 'yyyy-MM-dd HH:mm');
};

export const updateBarFromTick = ({
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

export const updateBarFromMinuteBar = ({
  bars,
  bar,
  period,
  time,
}: {
  bars: Bars;
  bar: Bar;
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
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: 0,
    });
  }

  // remove the last items
  while (barsToUpdate.length > MaximumBarCount) {
    barsToUpdate.shift();
  }

  // get the last bar
  const toUpdate = barsToUpdate[barsToUpdate.length - 1];

  // update volume
  toUpdate.volume += bar.volume;

  // update price info
  toUpdate.close = bar.close;
  if (bar.high > toUpdate.high) {
    toUpdate.high = bar.high;
  }
  if (bar.low < toUpdate.low) {
    toUpdate.low = bar.low;
  }
};

export function getRetraceFromHigh(bars: Bar[], high: number) {
  let currentRetrace = 0;

  for (let index = bars.length - 1; index > 0; index -= 1) {
    const bar = bars[index];

    if (bar.high >= high) {
      return currentRetrace;
    }

    currentRetrace = Math.max(currentRetrace, high - bar.low);
  }

  return currentRetrace;
}

export function getHigh(bars: Bar[]) {
  return bars.reduce((high, bar) => Math.max(high, bar.high), 0);
}
