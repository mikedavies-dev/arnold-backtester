import {startOfToday} from 'date-fns';

import {initTracker, updateTracker} from '../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../utils/market';
import {createTick, createTime, getTestDate} from '../utils/tick';

test('market open times', () => {
  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  expect(marketOpen).toBe(createTime('09:30'));
  expect(marketClose).toBe(createTime('16:30'));
});

test('in-market high', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  // Make sure we don't update on a bid
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:29'),
      type: 'BID',
      value: 1,
      size: 100,
    }),
  });

  expect(data.high).toBe(0);

  // Don't update in pre-market
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:29'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.high).toBe(0);
  expect(data.last).toBe(1);

  // Update the first value
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.high).toBe(1);
  expect(data.last).toBe(1);

  // Make sure it updates with a second
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  expect(data.high).toBe(2);
  expect(data.last).toBe(2);

  // Don't go back down
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
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
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:29'),
      type: 'BID',
      value: 1,
      size: 100,
    }),
  });

  expect(data.low).toBe(0);

  // Don't update in pre-market
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:29'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.low).toBe(0);
  expect(data.last).toBe(1);

  // Update the first value
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.low).toBe(1);
  expect(data.last).toBe(1);

  // Make sure it updates with a second
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 0.9,
      size: 100,
    }),
  });

  expect(data.low).toBe(0.9);
  expect(data.last).toBe(0.9);

  // Don't go back down
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
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
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:29'),
      type: 'BID',
      value: 1,
      size: 100,
    }),
  });

  // Don't update in pre-market
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:29'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.volume).toBe(100);

  // Update the first value
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 1,
      size: 100,
    }),
  });

  expect(data.volume).toBe(200);

  // Make sure it updates with a second
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 0.9,
      size: 100,
    }),
  });

  expect(data.volume).toBe(300);

  // Don't go back down
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 1.4,
      size: 150,
    }),
  });

  expect(data.volume).toBe(450);
});
