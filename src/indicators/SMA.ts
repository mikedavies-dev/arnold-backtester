import {Bar, LineIndicator} from '../core';

export default function SMA(period: number, bars: Bar[]): LineIndicator {
  let values: number[] = [];

  let prev = 0;
  let sum = 0;

  return {
    recalculate() {
      if (bars.length < period) {
        values = [];
        return;
      }

      // reset
      sum = 0;
      values = new Array<number>(bars.length - period);

      for (let index = 0; index < bars.length; index++) {
        const bar = bars[index];
        sum += bar.close;

        if (index >= period) {
          sum -= bars[index - period].close;
          values[index - period] = sum / period;
        }

        prev = bar.close;
      }
    },
    updateLatest() {
      // use the latest value stored in prev to update the SMA
      const bar = bars.at(-1);
      if (bar) {
        sum -= prev;
        prev = bar.close;
        sum += prev;
        values[values.length - 1] = sum / period;
      }
    },
    get values() {
      return values;
    },
    dependencies: [bars],
  };
}
