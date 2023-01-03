import {initTracker, handleTrackerTick} from '../../utils/tracker';
import {MarketStatus} from '../../core';
import {
  getMarketOpen,
  getMarketClose,
  getMarketState,
  getPreMarketOpen,
} from '../../utils/market';
import {createTick, createTimeAsUnix, getTestDate} from '../testing/tick';

test('market open times', () => {
  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  expect(marketOpen).toBe(createTimeAsUnix('09:30'));
  expect(marketClose).toBe(createTimeAsUnix('16:00'));
});

test('in-market high', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  // Make sure we don't update on a bid
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'BID',
      value: 1,
      size: 100,
    }),
  });

  expect(data.high).toBe(0);

  // Don't update in pre-market
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.high).toBe(0);
  expect(data.last).toBe(1);

  // Update the first value
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.high).toBe(1);
  expect(data.last).toBe(1);

  // Make sure it updates with a second
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  expect(data.high).toBe(2);
  expect(data.last).toBe(2);

  // Don't go back down
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 1.4,
      size: 100,
    }),
  });

  expect(data.high).toBe(2);
  expect(data.last).toBe(1.4);
});

test('in-market low', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  // Make sure we don't update on a bid
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'BID',
      value: 1,
      size: 100,
    }),
  });

  expect(data.low).toBe(0);

  // Don't update in pre-market
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.low).toBe(0);
  expect(data.last).toBe(1);

  // Update the first value
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.low).toBe(1);
  expect(data.last).toBe(1);

  // Make sure it updates with a second
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 0.9,
      size: 100,
    }),
  });

  expect(data.low).toBe(0.9);
  expect(data.last).toBe(0.9);

  // Don't go back down
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 1.4,
      size: 100,
    }),
  });

  expect(data.low).toBe(0.9);
  expect(data.last).toBe(1.4);
});

test('in-market volume', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  // Make sure we don't update on a bid
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'BID',
      value: 1,
      size: 100,
    }),
  });

  // Don't update in pre-market
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.volume).toBe(100);

  // Update the first value
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.volume).toBe(200);

  // Make sure it updates with a second
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 0.9,
      size: 100,
    }),
  });

  expect(data.volume).toBe(300);

  // Don't go back down
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 1.4,
      size: 150,
    }),
  });

  expect(data.volume).toBe(450);
});

describe('market status', () => {
  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());
  const preMarketOpen = getPreMarketOpen(getTestDate());

  const times: Array<[string, MarketStatus]> = [
    ['01:00', 'CLOSED'],
    ['03:59', 'CLOSED'],
    ['04:00', 'PREMARKET'],
    ['04:01', 'PREMARKET'],
    ['09:29', 'PREMARKET'],
    ['09:30', 'OPEN'],
    ['16:00', 'OPEN'],
    ['16:01', 'CLOSED'],
  ];

  times.forEach(([time, marketStatus]) => {
    test(`that ${time} has a market status of ${marketStatus}`, () => {
      expect(
        getMarketState(
          createTimeAsUnix(time),
          preMarketOpen,
          marketOpen,
          marketClose,
        ),
      ).toBe(marketStatus);
    });
  });
});
