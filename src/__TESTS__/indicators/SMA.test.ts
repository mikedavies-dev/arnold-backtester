import {Bar} from '../../core';
import SMA from '../../indicators/SMA';
import {deepCopy} from '../testing/utils';

describe('average true range', () => {
  test('empty EMA', () => {
    const bars: Bar[] = [];
    const indicator = SMA(4, bars);
    indicator.recalculate();

    expect(indicator.values).toStrictEqual([]);
  });

  const base = {
    time: '09:30:00',
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
  };

  const sourceBars: Bar[] = [
    {...base, time: '09:30:00', close: 1},
    {...base, time: '09:30:01', close: 2},
    {...base, time: '09:30:02', close: 1},
    {...base, time: '09:30:03', close: 1},
    {...base, time: '09:30:04', close: 1},
    {...base, time: '09:30:05', close: 1},
    {...base, time: '09:30:06', close: 4},
    {...base, time: '09:30:07', close: 1},
    {...base, time: '09:30:08', close: 1},
    {...base, time: '09:30:09', close: 2},
    {...base, time: '09:30:10', close: 1},
  ];

  test('basic SMA test without updating existing data', () => {
    const bars = deepCopy(sourceBars);

    const indicator = SMA(4, bars);
    indicator.recalculate();

    expect(indicator.values).toStrictEqual([
      1.25, 1, 1.75, 1.75, 1.75, 2, 1.25,
    ]);
  });

  test('basic SMA test with updates', () => {
    const bars = deepCopy(sourceBars);
    const indicator = SMA(4, bars);
    indicator.recalculate();

    // set to 5
    bars[bars.length - 1].close = 5;
    indicator.updateLatest();

    expect(indicator.values).toStrictEqual([
      1.25, 1, 1.75, 1.75, 1.75, 2, 2.25,
    ]);

    // set to 10
    bars[bars.length - 1].close = 10;
    indicator.updateLatest();

    expect(indicator.values).toStrictEqual([1.25, 1, 1.75, 1.75, 1.75, 2, 3.5]);

    // set to 5.34
    bars[bars.length - 1].close = 5.34;
    indicator.updateLatest();

    expect(indicator.values).toStrictEqual([
      1.25, 1, 1.75, 1.75, 1.75, 2, 2.335,
    ]);
  });
});
