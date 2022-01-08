import {initTracker} from '../../utils/tracker';

test('init tracker', () => {
  const tracker = initTracker();

  expect(tracker).toMatchInlineSnapshot(`
    Object {
      "ask": 0,
      "bars": Object {},
      "bid": 0,
      "high": 0,
      "last": 0,
      "low": 0,
      "open": 0,
      "preMarketHigh": 0,
      "preMarketLow": 0,
      "preMarketVolume": 0,
      "retraceFromHigh": 0,
      "retraceFromLow": 0,
      "volume": 0,
    }
  `);
});
