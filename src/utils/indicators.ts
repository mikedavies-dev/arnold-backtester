import {Indicator, IndicatorUpdater, LineIndicator} from '../core';
import {last} from './arrays';

export function indicatorUpdateWrapper(indicator: Indicator): IndicatorUpdater {
  const barsToTime = indicator.dependencies.map(bars => {
    return {
      bars,
      time: bars.at(-1)?.time || '',
    };
  });

  return {
    update() {
      // have any of our dependencies moved to a new bar? if so we need to recalc
      const hasNewBar = barsToTime.some(
        ({time, bars}) => time !== (bars.at(-1)?.time || ''),
      );

      // update bars
      barsToTime.forEach(({bars}, ix) => {
        barsToTime[ix].time = bars.at(-1)?.time || '';
      });

      // calculate the last bar or recalculate all
      const update = hasNewBar ? indicator.recalculate : indicator.updateLatest;

      update();
    },
  };
}

export function latest(indicator: LineIndicator): number {
  return last(indicator.values, 0);
}
