import {Bar, LineIndicator} from '../core';

export default function EMA(period: number, bars: Bar[]): LineIndicator {
  let values: number[] = [];

  const k = 2 / (1 + period);
  const m = 1 - k;

  return {
    recalculate() {
      values = new Array<number>(bars.length);

      if (values.length > 0) {
        values[0] = bars[0].close;

        for (let i = 1; i < values.length; i++) {
          values[i] = bars[i].close * k + values[i - 1] * m;
        }
      }
    },
    updateLatest() {
      const bar = bars.at(-1);

      if (bar) {
        values[values.length - 1] =
          bar.close * k + values[values.length - 2] * m;
      }
    },
    get values() {
      return values;
    },
    dependencies: [bars],
  };
}
