import {startOfToday} from 'date-fns';

import {initTracker, handleTrackerTick} from '../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../utils/market';
import {createTick, createTimeAsUnix} from '../test-utils/tick';

test('bid/ask', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

  expect(data.bid).toBe(0);
  expect(data.ask).toBe(0);

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

  expect(data.bid).toBe(1);
  expect(data.ask).toBe(0);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'BID',
      value: 2,
      size: 100,
    }),
  });

  expect(data.bid).toBe(2);
  expect(data.ask).toBe(0);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'ASK',
      value: 1.8,
      size: 100,
    }),
  });

  expect(data.bid).toBe(2);
  expect(data.ask).toBe(1.8);
});

test('high/low', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

  expect(data.high).toBe(0);
  expect(data.low).toBe(0);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'HIGH',
      value: 1,
      size: 0,
    }),
  });

  expect(data.high).toBe(1);
  expect(data.low).toBe(0);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'LOW',
      value: 0.5,
      size: 0,
    }),
  });

  expect(data.high).toBe(1);
  expect(data.low).toBe(0.5);
});

test('volume delta', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

  expect(data.volume).toBe(0);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:29'),
      type: 'VOLUME_DELTA',
      value: 1000,
      size: 0,
    }),
  });

  expect(data.volume).toBe(1000);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'VOLUME_DELTA',
      value: 1500,
      size: 0,
    }),
  });

  expect(data.volume).toBe(2500);
});
