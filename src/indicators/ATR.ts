import {Bar, LineIndicator} from '../core';

export default function ATR(period: number, bars: Bar[]): LineIndicator {
  const trueRangeOfBar = ({high, low, close}: Bar) =>
    Math.max(high - low, high - close, close - low);

  let values: number[] = [];
  let trueRange: number[] = [];

  return {
    recalculate() {
      trueRange = bars.map(trueRangeOfBar);

      values = trueRange.map((_value, ix) => {
        if (ix < period) {
          return 0;
        }

        const part = trueRange.slice(ix - period, ix);
        return part.reduce((acc, val) => acc + val, 0) / period;
      });
    },
    updateLatest() {
      const bar = bars.at(-1);

      if (bar) {
        const length = trueRange.length;

        // update the last true range value
        trueRange[length - 1] = trueRangeOfBar(bar);

        // update the last average
        const part = trueRange.slice(length - period, length);

        values[length - 1] =
          part.length === period
            ? part.reduce((acc, val) => acc + val, 0) / period
            : 0;
      }
    },
    get values() {
      return values;
    },
    dependencies: [bars],
  };
}
