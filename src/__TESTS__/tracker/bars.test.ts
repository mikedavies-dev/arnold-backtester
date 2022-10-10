import {addMinutes, getUnixTime} from 'date-fns';

import {
  initTracker,
  handleTrackerTick,
  handleTrackerMinuteBar,
} from '../../utils/tracker';
import {formatBarTime, updateBarFromMinuteBar} from '../../utils/bars';

import {MaximumBarCount, Periods} from '../../core';

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

test('update bar data from minute data', () => {
  const tracker = initTracker();

  const marketOpen = getMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  expect(tracker.bars).toMatchInlineSnapshot(`
    Object {
      "daily": Array [],
      "m1": Array [],
      "m5": Array [],
    }
  `);

  // Update a bar
  handleTrackerMinuteBar({
    data: tracker,
    bar: {
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
      time: formatBarTime(Periods.m1, createTimeAsUnix('09:30')),
    },
    marketTime: createTimeAsUnix('09:30'),
    marketOpen,
    marketClose,
  });

  expect(tracker.bars).toMatchInlineSnapshot(`
    Object {
      "daily": Array [
        Object {
          "close": 1,
          "high": 1,
          "low": 1,
          "open": 1,
          "time": "2022-01-01 00:00",
          "volume": 1,
        },
      ],
      "m1": Array [
        Object {
          "close": 1,
          "high": 1,
          "low": 1,
          "open": 1,
          "time": "2022-01-01 09:30",
          "volume": 1,
        },
      ],
      "m5": Array [
        Object {
          "close": 1,
          "high": 1,
          "low": 1,
          "open": 1,
          "time": "2022-01-01 09:30",
          "volume": 1,
        },
      ],
    }
  `);

  // Update a bar
  handleTrackerMinuteBar({
    data: tracker,
    bar: {
      open: 2,
      high: 4,
      low: 0.5,
      close: 3,
      volume: 1,
      time: formatBarTime(Periods.m1, createTimeAsUnix('09:31')),
    },
    marketTime: createTimeAsUnix('09:31'),
    marketOpen,
    marketClose,
  });

  expect(tracker.bars).toMatchInlineSnapshot(`
    Object {
      "daily": Array [
        Object {
          "close": 3,
          "high": 4,
          "low": 0.5,
          "open": 1,
          "time": "2022-01-01 00:00",
          "volume": 2,
        },
      ],
      "m1": Array [
        Object {
          "close": 1,
          "high": 1,
          "low": 1,
          "open": 1,
          "time": "2022-01-01 09:30",
          "volume": 1,
        },
        Object {
          "close": 3,
          "high": 4,
          "low": 0.5,
          "open": 2,
          "time": "2022-01-01 09:31",
          "volume": 1,
        },
      ],
      "m5": Array [
        Object {
          "close": 3,
          "high": 4,
          "low": 0.5,
          "open": 1,
          "time": "2022-01-01 09:30",
          "volume": 2,
        },
      ],
    }
  `);
});
