import {Bar} from '../../core';
import EMA from '../../indicators/EMA';
import {updateBar} from '../testing/indicators';
import {indicatorUpdateWrapper} from '../../utils/indicators';
import {makeBars} from '../testing/indicators';

describe('average true range', () => {
  test('empty EMA', () => {
    const bars: Bar[] = [];
    const indicator = EMA(4, bars);
    const updater = indicatorUpdateWrapper(indicator);

    expect(indicator.values).toStrictEqual([]);

    updateBar(updater, bars, '09:30:00', 1);
    expect(indicator.values).toStrictEqual([1]);
  });

  test('basic EMA', () => {
    const bars = makeBars([1, 2, 1, 1, 1, 1, 4, 1, 1, 2, 1]);
    const indicator = EMA(4, bars);
    indicator.recalculate();
    expect(indicator.values).toMatchInlineSnapshot(`
      [
        1,
        1.4,
        1.24,
        1.1440000000000001,
        1.0864,
        1.0518399999999999,
        2.231104,
        1.7386624,
        1.44319744,
        1.6659184640000002,
        1.3995510784,
      ]
    `);
  });

  test('test updating last value and recalculating values', () => {
    const bars = makeBars([1, 2, 1, 1, 1, 1, 4, 1, 1, 2, 1]);
    const indicator = EMA(4, bars);
    indicator.recalculate();
    expect(indicator.values.at(-1)).toBe(1.3995510784);

    // update the last value and recalculate
    bars[bars.length - 1].close = 5;
    indicator.updateLatest();
    expect(indicator.values.at(-1)).toBe(2.9995510784);

    // update the last value and recalculate
    bars[bars.length - 1].close = 9;
    indicator.updateLatest();
    expect(indicator.values.at(-1)).toBe(4.5995510784);
  });
});
