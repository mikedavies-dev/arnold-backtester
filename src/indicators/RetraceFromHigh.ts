import {getUnixTime, isSameDay} from 'date-fns';
import {Bar, ValueIndicator} from '../core';
import {parseDateTime} from '../utils/dates';
import {getMarketOpen} from '../utils/market';

export default function RetraceFromHigh(bars: Bar[]): ValueIndicator {
  let high = 0;
  let low = Infinity;
  let value = 0;

  return {
    recalculate() {
      value = 0;
      high = 0;
      low = Infinity;

      if (bars.length) {
        const latest = bars.at(-1) as Bar;
        const time = parseDateTime(latest.time);

        if (time) {
          const marketOpen = getMarketOpen(time);
          const barsToday = bars.filter(b => {
            const barTime = parseDateTime(b.time);

            return (
              barTime &&
              // only include bars that are greater or equal than today's open
              getUnixTime(barTime) >= marketOpen
            );
          });

          if (barsToday.length === 0) {
            return 0;
          }

          // find the high
          let highAt = 0;
          for (let ix = 0; ix < barsToday.length; ix += 1) {
            const bar = barsToday[ix];

            if (bar.high > high) {
              high = bar.high;
              highAt = ix;
            }
          }

          // find the low since the high
          for (let ix = highAt; ix < barsToday.length; ix += 1) {
            const bar = barsToday[ix];
            if (bar.low < low) {
              low = bar.low;
            }
          }

          value = high - low;
        }
      }
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
        value = high - low;
      }
    },
    get value() {
      return value;
    },
    dependencies: [bars],
  };
}
