import {Bar} from '../../core';
import RetraceFromHigh from '../../indicators/RetraceFromHigh';
import {updateBar} from '../testing/indicators';
import {indicatorUpdateWrapper} from '../../utils/indicators';

describe('indicators - retrace from high', () => {
  test('get the latest value from empty input data', () => {
    const indicator = RetraceFromHigh([]);

    expect(indicator.values).toStrictEqual([]);
    expect(indicator.values.length).toBe(0);
  });

  test('updating the same bar', () => {
    const bars: Bar[] = [];
    const indicator = RetraceFromHigh(bars);
    const updater = indicatorUpdateWrapper(indicator);

    expect(indicator.values).toStrictEqual([]);

    updateBar(updater, bars, '2022-01-01 09:30', 1);
    expect(indicator.values).toStrictEqual([0]);

    updateBar(updater, bars, '2022-01-01 09:30', 2);
    expect(indicator.values).toStrictEqual([0]);

    updateBar(updater, bars, '2022-01-01 09:30', 1.2);
    expect(indicator.values).toStrictEqual([0.8]);
  });

  test('updating the a new bar', () => {
    const bars: Bar[] = [];
    const indicator = RetraceFromHigh(bars);
    const updater = indicatorUpdateWrapper(indicator);

    expect(indicator.values).toStrictEqual([]);

    updateBar(updater, bars, '2022-01-01 09:30', 2);
    expect(indicator.values).toStrictEqual([0]);

    updateBar(updater, bars, '2022-01-01 09:30', 1);
    expect(indicator.values).toStrictEqual([1]);

    updateBar(updater, bars, '2022-01-01 09:31', 3);
    expect(indicator.values).toStrictEqual([1, 0]);

    updateBar(updater, bars, '2022-01-01 09:31', 4);
    expect(indicator.values).toStrictEqual([1, 0]);

    updateBar(updater, bars, '2022-01-01 09:31', 2);
    expect(indicator.values).toStrictEqual([1, 2]);

    updateBar(updater, bars, '2022-01-01 09:32', 5);
    expect(indicator.values).toStrictEqual([1, 2, 0]);

    updateBar(updater, bars, '2022-01-01 09:32', 3);
    expect(indicator.values).toStrictEqual([1, 2, 2]);

    updateBar(updater, bars, '2022-01-01 09:33', 2);
    expect(indicator.values).toStrictEqual([1, 2, 2, 3]);
  });

  test('resetting the high on a new day', () => {
    const bars: Bar[] = [];
    const indicator = RetraceFromHigh(bars);
    const updater = indicatorUpdateWrapper(indicator);

    expect(indicator.values).toStrictEqual([]);

    updateBar(updater, bars, '2022-01-01 09:30', 2);
    expect(indicator.values).toStrictEqual([0]);

    updateBar(updater, bars, '2022-01-01 09:30', 1);
    expect(indicator.values).toStrictEqual([1]);

    updateBar(updater, bars, '2022-01-02 08:30', 1);
    expect(indicator.values).toStrictEqual([1, 0]);
  });
});
