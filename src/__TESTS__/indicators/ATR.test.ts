import {Bar} from '../../core';
import ATR from '../../indicators/ATR';
import {updateBar} from '../testing/indicators';

describe('average true range', () => {
  test('empty average true range', () => {
    const bars: Bar[] = [];
    const indicator = ATR(4, bars);

    expect(indicator.values()).toStrictEqual([]);

    updateBar(indicator, bars, '09:30:00', 1);
    expect(indicator.values()).toStrictEqual([0]);
  });
});
