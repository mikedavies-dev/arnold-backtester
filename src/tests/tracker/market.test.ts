import {startOfToday, fromUnixTime} from 'date-fns';

import {initTracker, updateTracker} from '../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../utils/market';
import {Tick, TickType} from '../../utils/data';

function createTick({
  type,
  time,
  value,
  size,
}: {
  type: TickType;
  time: number;
  value: number;
  size: number;
}): Tick {
  return {
    type,
    time,
    value,
    size,
    dateTime: fromUnixTime(time),
    symbol: 'AAAA',
    index: 0,
  };
}

test('in-market high', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

  // Make sure we don't update on a bid
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: marketOpen - 1,
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
      time: marketOpen - 1,
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
      time: marketOpen,
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
      time: marketOpen,
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
      time: marketOpen,
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

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

  // Make sure we don't update on a bid
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: marketOpen - 1,
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
      time: marketOpen - 1,
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
      time: marketOpen,
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
      time: marketOpen,
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
      time: marketOpen,
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

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

  // Make sure we don't update on a bid
  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: marketOpen - 1,
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
      time: marketOpen - 1,
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
      time: marketOpen,
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
      time: marketOpen,
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
      time: marketOpen,
      type: 'TRADE',
      value: 1.4,
      size: 150,
    }),
  });

  expect(data.volume).toBe(450);
});
