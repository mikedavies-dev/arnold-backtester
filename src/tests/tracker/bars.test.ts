import {addMinutes, getUnixTime} from 'date-fns';

import {
  initTracker,
  handleTrackerTick,
  MaximumBarCount,
} from '../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../utils/market';

import {createTick, createTimeAsUnix, getTestDate} from '../test-utils/tick';

test('1m bars', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

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

  expect(data.bars.m1).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 2,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 100,
      },
    ]
  `);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 2.1,
      size: 100,
    }),
  });

  expect(data.bars.m1).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2.1,
        "high": 2.1,
        "low": 2,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 200,
      },
    ]
  `);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 2.2,
      size: 100,
    }),
  });

  expect(data.bars.m1).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2.2,
        "high": 2.2,
        "low": 2,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 300,
      },
    ]
  `);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:30'),
      type: 'TRADE',
      value: 1.9,
      size: 100,
    }),
  });

  expect(data.bars.m1).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 1.9,
        "high": 2.2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 400,
      },
    ]
  `);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:31'),
      type: 'TRADE',
      value: 2.1,
      size: 100,
    }),
  });

  expect(data.bars.m1).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 1.9,
        "high": 2.2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 400,
      },
      Object {
        "close": 2.1,
        "high": 2.1,
        "low": 2.1,
        "open": 2.1,
        "time": "2022-01-01 09:31",
        "volume": 100,
      },
    ]
  `);
});

test('5m bars', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

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

  expect(data.bars.m5).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 2,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 100,
      },
    ]
  `);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:31'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:31'),
      type: 'TRADE',
      value: 1.9,
      size: 100,
    }),
  });

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:31'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  expect(data.bars.m5).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 400,
      },
    ]
  `);

  handleTrackerTick({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTimeAsUnix('09:36'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  expect(data.bars.m5).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-01 09:30",
        "volume": 400,
      },
      Object {
        "close": 2,
        "high": 2,
        "low": 2,
        "open": 2,
        "time": "2022-01-01 09:35",
        "volume": 100,
      },
    ]
  `);
});

test('removing extra bars from data when we hit the limit', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  Array(MaximumBarCount * 2)
    .fill(0)
    .forEach((_, index) => {
      handleTrackerTick({
        data,
        marketOpen,
        marketClose,
        tick: createTick({
          time: getUnixTime(addMinutes(getTestDate(), index)),
          type: 'TRADE',
          value: 2,
          size: 100,
        }),
      });
    });

  expect(data.bars.m1.length).toBe(MaximumBarCount);
});
