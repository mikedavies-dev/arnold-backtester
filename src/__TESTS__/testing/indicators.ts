import {Bar, IndicatorUpdater} from '../../core';

export function updateBar(
  indicator: IndicatorUpdater,
  bars: Bar[],
  time: string,
  value: number,
) {
  if (!bars.length || bars.at(-1)?.time !== time) {
    const last = bars.at(-1);
    bars.push({
      time,
      open: last?.close || value,
      high: value,
      low: value,
      close: value,
      volume: 0,
    });
  }

  const last = bars.at(-1) as Bar;

  last.close = value;
  last.high = Math.max(last.high, value);
  last.low = Math.min(last.low, value);

  indicator.update();
}
