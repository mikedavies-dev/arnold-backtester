import {initTracker} from '../../utils/tracker';

test('init tracker', () => {
  const tracker = initTracker();

  expect(tracker.open).toBe(0);
  expect(tracker.high).toBe(0);
  expect(tracker.low).toBe(0);
  expect(tracker.last).toBe(0);
});
