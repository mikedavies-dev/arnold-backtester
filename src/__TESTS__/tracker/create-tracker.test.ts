import {initTracker} from '../../utils/tracker';

test('init tracker', () => {
  const tracker = initTracker();

  expect(tracker).toEqual(
    expect.objectContaining({
      ask: 0,
      bid: 0,
      high: 0,
      low: 0,
      open: 0,
      last: 0,
      prevClose: 0,
      preMarketHigh: 0,
      preMarketLow: 0,
      preMarketVolume: 0,
      volume: 0,
      bars: {
        daily: [],
        m1: [],
        m5: [],
      },
    }),
  );
});
