import {initTracker, handleTrackerTick} from '../../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../../utils/market';
import {createTick, createTimeAsUnix, getTestDate} from '../test-utils/tick';

test('pre-market high', () => {
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

  expect(data.preMarketHigh).toBe(0);

  // Update the first value
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

  expect(data.preMarketHigh).toBe(1);

  // Make sure it updates with a second
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  expect(data.preMarketHigh).toBe(2);

  // Don't go back down
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'TRADE',
      value: 1.4,
      size: 100,
    }),
  });

  expect(data.preMarketHigh).toBe(2);

  // Don't update after the market is open
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 3,
      size: 100,
    }),
  });

  expect(data.preMarketHigh).toBe(2);
});

test('pre-market low', () => {
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

  expect(data.preMarketLow).toBe(0);

  // Update the first value
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

  expect(data.preMarketLow).toBe(1);

  // Make sure it updates with a second
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'TRADE',
      value: 0.8,
      size: 100,
    }),
  });

  expect(data.preMarketLow).toBe(0.8);

  // Don't go back down
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'TRADE',
      value: 1.2,
      size: 100,
    }),
  });

  expect(data.preMarketLow).toBe(0.8);

  // Don't update after the market is open
  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 0.4,
      size: 100,
    }),
  });

  expect(data.preMarketLow).toBe(0.8);
});

test('pre-market volume', () => {
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

  expect(data.preMarketVolume).toBe(100);

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

  expect(data.preMarketVolume).toBe(100);
});
