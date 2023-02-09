import {Bar, LineIndicator} from '../core';

export default function RetraceFromHigh(bars: Bar[]): LineIndicator {
  let high = 0;
  let low = 0;

  let values: number[] = [];

  return {
    recalculate() {
      high = 0;
      low = 0;

      values = bars.map(bar => {
        if (bar.high > high) {
          high = bar.high;
          low = bar.high;
        }

        if (bar.close < low) {
          low = bar.close;
        }

        return high - low;
      });
    },
    updateLatest() {
      const bar = bars.at(-1);

      if (bar) {
        // see if the last bar high is higher than ours, if so then reset
        if (bar.high > high) {
          high = bar.close;
          low = bar.close;
        }

        if (bar.close < low) {
          low = bar.close;
        }

        // update the current retrace
        values[values.length - 1] = high - low;
      }
    },
    get values() {
      return values;
    },
    dependencies: [bars],
  };
}
