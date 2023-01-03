import {Bar, LineIndicator} from '../core';

export default function RetraceFromHigh(bars: Bar[]): LineIndicator {
  // calculate the entire array
  let high = 0;

  const calculate = () => {
    high = 0;

    return bars.map(bar => {
      if (bar.high > high) {
        high = bar.high;
      }

      // should we use low here?
      return high - bar.close;
    });
  };

  let values = calculate();
  let time = bars.at(-1)?.time;

  return {
    update() {
      const bar = bars.at(-1);

      if (bar) {
        // if the latest bar has changed then recalculate
        if (bar.time !== time) {
          time = bar.time;
          values = calculate();
          return;
        }

        // see if the last bar high is higher than ours, if so then reset
        if (bar.high > high) {
          high = bar.high;
          return;
        }

        // update the current retrace
        values[values.length - 1] = high - bar.close;
      }
    },
    last() {
      return values.at(-1) || 0;
    },
    values() {
      return values;
    },
  };
}
