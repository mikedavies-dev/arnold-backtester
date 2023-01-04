import {Bar, LineIndicator} from '../core';

export default function RetraceFromHigh(bars: Bar[]): LineIndicator {
  let high = 0;
  let values: number[] = [];

  return {
    recalculate() {
      high = 0;

      values = bars.map(bar => {
        if (bar.high > high) {
          high = bar.high;
        }

        // should we use low here?
        return high - bar.close;
      });
    },
    updateLatest() {
      const bar = bars.at(-1);

      if (bar) {
        // see if the last bar high is higher than ours, if so then reset
        if (bar.high > high) {
          high = bar.high;
        }

        // update the current retrace
        values[values.length - 1] = high - bar.close;
      }
    },
    get values() {
      return values;
    },
    dependencies: [bars],
  };
}
