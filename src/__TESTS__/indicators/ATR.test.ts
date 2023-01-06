import {Bar} from '../../core';
import ATR from '../../indicators/ATR';
import {updateBar} from '../testing/indicators';
import {indicatorUpdateWrapper, latest} from '../../utils/indicators';

describe('average true range', () => {
  test('empty average true range', () => {
    const bars: Bar[] = [];
    const indicator = ATR(4, bars);
    const updater = indicatorUpdateWrapper(indicator);

    expect(indicator.values).toStrictEqual([]);

    updateBar(updater, bars, '09:30:00', 1);
    expect(indicator.values).toStrictEqual([0]);
  });

  test.only('test updating last value and recalculating values', () => {
    const bars: Bar[] = [];
    const indicator = ATR(4, bars);
    const updater = indicatorUpdateWrapper(indicator);

    updateBar(updater, bars, '09:30:00', 1);
    updateBar(updater, bars, '09:30:00', 2);

    updateBar(updater, bars, '09:30:01', 2);
    updateBar(updater, bars, '09:30:01', 5);

    updateBar(updater, bars, '09:30:02', 3);
    updateBar(updater, bars, '09:30:02', 4);

    updateBar(updater, bars, '09:30:03', 2);
    updateBar(updater, bars, '09:30:03', 3);

    expect(latest(indicator)).toEqual(1.5);

    // update the latest value
    updateBar(updater, bars, '09:30:03', 9);
    expect(latest(indicator)).toEqual(3);

    updateBar(updater, bars, '09:30:03', 100);
    expect(latest(indicator)).toEqual(25.75);

    // add some new values
    updateBar(updater, bars, '09:30:04', 100);
    updateBar(updater, bars, '09:30:04', 150);

    expect(latest(indicator)).toEqual(38);
  });
});
