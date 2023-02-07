import {Tracker, BarPeriod, Bar, Periods, TickType} from '../core';

import {updateBarFromTick, updateBarFromMinuteBar, formatBarTime} from './bars';

const periods: Array<BarPeriod> = ['m1', 'm5', 'm60', 'daily'];

export function initTracker(): Tracker {
  return {
    open: 0,
    high: 0,
    low: 0,
    last: 0,
    prevClose: 0,
    volume: 0,
    bid: 0,
    ask: 0,
    preMarketHigh: 0,
    preMarketLow: 0,
    preMarketVolume: 0,
    bars: {
      m1: [],
      m5: [],
      m60: [],
      daily: [],
    },
  };
}

export function handleTrackerTick({
  data,
  tick,
  marketOpen,
  marketClose,
}: {
  data: Tracker;
  tick: {
    time: number;
    type: TickType;
    value: number;
    size: number;
  };
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

    case 'LAST':
      data.last = value;
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
        updateBarFromTick({
          bars: data.bars,
          price: value,
          volume: size,
          period,
          time,
        }),
      );
      break;

    case 'VOLUME_DELTA':
      periods.forEach(period =>
        updateBarFromTick({
          bars: data.bars,
          price: data.last,
          volume: value,
          period,
          time,
        }),
      );
      data.volume += value;
      break;

    case 'HIGH':
      data.high = value;
      break;

    case 'LOW':
      data.low = value;
      break;

    case 'CLOSE':
      data.prevClose = value;
      break;
  }
}

export function handleTrackerMinuteBar({
  data,
  bar,
  marketOpen,
  marketClose,
  marketTime,
}: {
  data: Tracker;
  bar: Bar;
  marketOpen: number;
  marketClose: number;
  marketTime: number;
}) {
  // If we have already created a minute bar for this minute we should update the volume
  // to the diff of the the new bar - the last bar otherwise we'll add extra volume

  const {m1} = data.bars;

  const time = formatBarTime(Periods.m1, marketTime);

  if (m1.length) {
    const currentBar = m1[m1.length - 1];
    if (currentBar.time === time) {
      bar.volume = Math.max(0, bar.volume - currentBar.volume);
    }
  }

  const isMarketOpen = marketTime >= marketOpen && marketTime <= marketClose;
  const isPreMarket = marketTime < marketOpen;

  // Pre-market data
  if (isPreMarket) {
    if (!data.preMarketHigh || bar.high > data.preMarketHigh) {
      data.preMarketHigh = bar.high;
    }

    if (!data.preMarketLow || bar.low < data.preMarketLow) {
      data.preMarketLow = bar.low;
    }

    data.preMarketVolume += bar.volume;
  }

  // Set open/high/low levels
  if (isMarketOpen) {
    if (!data.open) {
      data.open = bar.open;
    }

    if (!data.high || bar.high > data.high) {
      data.high = bar.high;
    }

    if (!data.low || bar.low < data.low) {
      data.low = bar.low;
    }
  }

  data.volume += bar.volume;
  data.last = bar.close;

  periods.forEach(period =>
    updateBarFromMinuteBar({
      bars: data.bars,
      bar,
      period,
      time: marketTime,
    }),
  );
}

export function handleMissingBar({
  data,
  marketTime,
  marketOpen,
  marketClose,
}: {
  data: Tracker;
  marketTime: number;
  marketOpen: number;
  marketClose: number;
}) {
  // Make sure we have some minute data
  if (!data.bars.m1.length) {
    return;
  }

  // get the last bar
  const lastBar = data.bars.m1[data.bars.m1.length - 1];

  // create a new bar based on the last to fill forward the data
  const bar: Bar = {
    open: lastBar.close,
    high: lastBar.close,
    low: lastBar.close,
    close: lastBar.close,
    volume: 0,
    time: formatBarTime(Periods.m1, marketTime),
  };

  // apply it to the tracker
  handleTrackerMinuteBar({
    data,
    bar,
    marketOpen,
    marketClose,
    marketTime,
  });
}
