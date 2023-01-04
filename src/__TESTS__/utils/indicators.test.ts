import {LineIndicator, Bar} from '../../core';
import {latest, indicatorUpdateWrapper} from '../../utils/indicators';

describe('indicator utils', () => {
  test('get the last value of an empty indicator', () => {
    const indicator: LineIndicator = {
      get values() {
        return [];
      },
      dependencies: [],
      updateLatest() {},
      recalculate() {},
    };

    expect(latest(indicator)).toBe(0);
  });

  test('get the last value of a populated indicator', () => {
    const indicator: LineIndicator = {
      get values() {
        return [1, 2, 3];
      },
      dependencies: [],
      updateLatest() {},
      recalculate() {},
    };

    expect(latest(indicator)).toBe(3);
  });

  test('updating an indicator with the same time', () => {
    const bars: Bar[] = [];

    const indicator: LineIndicator = {
      get values() {
        return [1, 2, 3];
      },
      dependencies: [bars],
      updateLatest: jest.fn(),
      recalculate: jest.fn(),
    };

    const updater = indicatorUpdateWrapper(indicator);
    updater.update();

    // No time update so we should have been called
    expect(indicator.updateLatest).toBeCalledTimes(1);
    expect(indicator.recalculate).toBeCalledTimes(0);

    bars.push({
      time: '00:00:00',
      open: 1,
      high: 1,
      low: 0,
      close: 0,
      volume: 0,
    });

    updater.update();

    expect(indicator.updateLatest).toBeCalledTimes(1);
    expect(indicator.recalculate).toBeCalledTimes(1);

    bars.push({
      time: '00:00:01',
      open: 1,
      high: 1,
      low: 0,
      close: 0,
      volume: 0,
    });

    updater.update();

    expect(indicator.updateLatest).toBeCalledTimes(1);
    expect(indicator.recalculate).toBeCalledTimes(2);
  });
});
