import {Bar, LineIndicator} from '../core';

export default function ATR(period: number, bars: Bar[]): LineIndicator {
  const trueRangeOfBar = ({high, low, close}: Bar) =>
    Math.max(high - low, high - close, close - low);

  const calculate = () => {
    const trueRange = bars.map(trueRangeOfBar);

    const atr = trueRange.map((value, ix) => {
      if (ix < period) {
        return 0;
      }

      const part = trueRange.slice(ix - period, ix);
      return part.reduce((acc, val) => acc + val, 0) / period;
    });

    return {
      atr,
      trueRange,
    };
  };

  let values = calculate();
  let time = bars.at(-1)?.time;

  return {
    update() {
      const bar = bars.at(-1);
      if (!bar) {
        return;
      }

      // if the latest bar has changed then recalculate the whole series
      if (bar.time !== time) {
        time = bar.time;
        values = calculate();
        return;
      }

      const length = values.trueRange.length;

      // update the last true range value
      values.trueRange[length - 1] = trueRangeOfBar(bar);

      // update the last average
      const part = values.trueRange.slice(length - period, length);
      values.atr[length - 1] = part.reduce((acc, val) => acc + val, 0) / period;
    },
    last() {
      return values.atr.at(-1) || 0;
    },
    values() {
      return values.atr;
    },
  };
}
