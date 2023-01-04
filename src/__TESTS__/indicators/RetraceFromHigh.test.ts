import {Bar} from '../../core';
import RetraceFromHigh from '../../indicators/RetraceFromHigh';
import {updateBar} from '../testing/indicators';

describe('indicators - retrace from high', () => {
  test('get the latest value from empty input data', () => {
    const indicator = RetraceFromHigh([]);

    expect(indicator.last()).toBe(0);
    expect(indicator.values().length).toBe(0);
  });

  test('updating the same bar', () => {
    const bars: Bar[] = [];
    const indicator = RetraceFromHigh(bars);

    expect(indicator.values()).toStrictEqual([]);

    updateBar(indicator, bars, '09:30:00', 1);
    expect(indicator.values()).toStrictEqual([0]);

    updateBar(indicator, bars, '09:30:00', 2);
    expect(indicator.values()).toStrictEqual([0]);

    updateBar(indicator, bars, '09:30:00', 1.2);
    expect(indicator.values()).toStrictEqual([0.8]);
  });

  test('updating the a new bar', () => {
    const bars: Bar[] = [];
    const indicator = RetraceFromHigh(bars);

    expect(indicator.values()).toStrictEqual([]);

    updateBar(indicator, bars, '09:30:00', 2);
    expect(indicator.values()).toStrictEqual([0]);

    updateBar(indicator, bars, '09:30:00', 1);
    expect(indicator.values()).toStrictEqual([1]);

    updateBar(indicator, bars, '09:30:01', 3);
    expect(indicator.values()).toStrictEqual([1, 0]);

    updateBar(indicator, bars, '09:30:01', 4);
    expect(indicator.values()).toStrictEqual([1, 0]);

    updateBar(indicator, bars, '09:30:01', 2);
    expect(indicator.values()).toStrictEqual([1, 2]);

    updateBar(indicator, bars, '09:30:02', 4);
    expect(indicator.values()).toStrictEqual([1, 2, 0]);

    updateBar(indicator, bars, '09:30:02', 3);
    expect(indicator.values()).toStrictEqual([1, 2, 1]);

    updateBar(indicator, bars, '09:30:03', 2);
    expect(indicator.values()).toStrictEqual([1, 2, 1, 2]);
  });
});
