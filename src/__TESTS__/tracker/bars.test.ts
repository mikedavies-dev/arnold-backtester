import {addMinutes, getUnixTime} from 'date-fns';

import {
  initTracker,
  handleTrackerTick,
  handleTrackerMinuteBar,
  handleMissingBar,
} from '../../utils/tracker';
import {formatBarTime, updateBarFromMinuteBar} from '../../utils/bars';

import {MaximumBarCount, Periods} from '../../core';

import {getMarketOpen, getMarketClose} from '../../utils/market';

import {createTick, createTimeAsUnix, getTestDate} from '../test-utils/tick';

describe('test updating bar data', () => {
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

  test('that we do not store than the maximum number of bars', () => {
    const tracker = initTracker();
    const startTime = createTimeAsUnix('09:30');

    for (let i = 0; i < MaximumBarCount * 2; i++) {
      const time = startTime + i * 60;
      updateBarFromMinuteBar({
        bars: tracker.bars,
        bar: {
          open: 1,
          high: 1,
          low: 1,
          close: 1,
          volume: 1,
          time: formatBarTime(Periods.m1, time),
        },
        time: time,
        period: 'm1',
      });

      // Make sure we are adding data
      expect(tracker.bars.m1.length).toBe(Math.min(MaximumBarCount, i + 1));

      // Make sure we don't have more than max bar count
      expect(tracker.bars.m1.length).toBeLessThanOrEqual(MaximumBarCount);
    }
  });

  test('set pre-market data from bars', () => {
    const tracker = initTracker();

    const marketOpen = getMarketOpen(getTestDate());
    const marketClose = getMarketClose(getTestDate());

    // Update a bar
    handleTrackerMinuteBar({
      data: tracker,
      bar: {
        open: 1,
        high: 2,
        low: 1,
        close: 2,
        volume: 1,
        time: formatBarTime(Periods.m1, createTimeAsUnix('08:30')),
      },
      marketTime: createTimeAsUnix('08:30'),
      marketOpen,
      marketClose,
    });

    expect(tracker).toEqual(
      expect.objectContaining({
        preMarketHigh: 2,
        preMarketLow: 1,
        preMarketVolume: 1,
      }),
    );

    handleTrackerMinuteBar({
      data: tracker,
      bar: {
        open: 1,
        high: 3,
        low: 0.5,
        close: 2,
        volume: 4,
        time: formatBarTime(Periods.m1, createTimeAsUnix('08:31')),
      },
      marketTime: createTimeAsUnix('08:31'),
      marketOpen,
      marketClose,
    });

    expect(tracker).toEqual(
      expect.objectContaining({
        preMarketHigh: 3,
        preMarketLow: 0.5,
        preMarketVolume: 5,
      }),
    );

    // Updating the data after the open should not change pre-market data
    handleTrackerMinuteBar({
      data: tracker,
      bar: {
        open: 1,
        high: 10,
        low: 0.1,
        close: 2,
        volume: 10,
        time: formatBarTime(Periods.m1, createTimeAsUnix('09:30')),
      },
      marketTime: createTimeAsUnix('09:30'),
      marketOpen,
      marketClose,
    });

    expect(tracker).toEqual(
      expect.objectContaining({
        preMarketHigh: 3,
        preMarketLow: 0.5,
        preMarketVolume: 5,
      }),
    );
  });

  test('forward filling bars when the data is missing', () => {
    const tracker = initTracker();

    const marketOpen = getMarketOpen(getTestDate());
    const marketClose = getMarketClose(getTestDate());

    // Make sure we don't have any data
    expect(tracker.bars.m1).toEqual([]);

    // Forward copy the bars
    handleMissingBar({
      data: tracker,
      marketTime: createTimeAsUnix('09:30'),
      marketOpen,
      marketClose,
    });

    // We still don't have any data because there is nothing to copy
    expect(tracker.bars.m1).toEqual([]);

    // Add a bar
    handleTrackerMinuteBar({
      data: tracker,
      bar: {
        open: 1,
        high: 2,
        low: 1,
        close: 2,
        volume: 1,
        time: formatBarTime(Periods.m1, createTimeAsUnix('09:30')),
      },
      marketTime: createTimeAsUnix('09:30'),
      marketOpen,
      marketClose,
    });

    expect(tracker.bars.m1).toMatchInlineSnapshot(`
      Array [
        Object {
          "close": 2,
          "high": 2,
          "low": 1,
          "open": 1,
          "time": "2022-01-01 09:30",
          "volume": 1,
        },
      ]
    `);

    // Forward copy the bars
    handleMissingBar({
      data: tracker,
      marketTime: createTimeAsUnix('09:31'),
      marketOpen,
      marketClose,
    });

    // Make sure data was copied over
    expect(tracker.bars.m1[1]).toEqual(
      expect.objectContaining({
        open: tracker.bars.m1[0].close,
        high: tracker.bars.m1[0].close,
        low: tracker.bars.m1[0].close,
        close: tracker.bars.m1[0].close,
        volume: 0,
      }),
    );

    expect(tracker.bars).toMatchInlineSnapshot(`
      Object {
        "daily": Array [
          Object {
            "close": 2,
            "high": 2,
            "low": 1,
            "open": 1,
            "time": "2022-01-01 00:00",
            "volume": 1,
          },
        ],
        "m1": Array [
          Object {
            "close": 2,
            "high": 2,
            "low": 1,
            "open": 1,
            "time": "2022-01-01 09:30",
            "volume": 1,
          },
          Object {
            "close": 2,
            "high": 2,
            "low": 2,
            "open": 2,
            "time": "2022-01-01 09:31",
            "volume": 0,
          },
        ],
        "m5": Array [
          Object {
            "close": 2,
            "high": 2,
            "low": 1,
            "open": 1,
            "time": "2022-01-01 09:30",
            "volume": 1,
          },
        ],
      }
    `);

    // Forward copy the bar again
    handleMissingBar({
      data: tracker,
      marketTime: createTimeAsUnix('09:32'),
      marketOpen,
      marketClose,
    });

    handleMissingBar({
      data: tracker,
      marketTime: createTimeAsUnix('09:33'),
      marketOpen,
      marketClose,
    });

    handleMissingBar({
      data: tracker,
      marketTime: createTimeAsUnix('09:34'),
      marketOpen,
      marketClose,
    });

    handleMissingBar({
      data: tracker,
      marketTime: createTimeAsUnix('09:35'),
      marketOpen,
      marketClose,
    });

    expect(tracker.bars).toMatchInlineSnapshot(`
      Object {
        "daily": Array [
          Object {
            "close": 2,
            "high": 2,
            "low": 1,
            "open": 1,
            "time": "2022-01-01 00:00",
            "volume": 1,
          },
        ],
        "m1": Array [
          Object {
            "close": 2,
            "high": 2,
            "low": 1,
            "open": 1,
            "time": "2022-01-01 09:30",
            "volume": 1,
          },
          Object {
            "close": 2,
            "high": 2,
            "low": 2,
            "open": 2,
            "time": "2022-01-01 09:31",
            "volume": 0,
          },
          Object {
            "close": 2,
            "high": 2,
            "low": 2,
            "open": 2,
            "time": "2022-01-01 09:32",
            "volume": 0,
          },
          Object {
            "close": 2,
            "high": 2,
            "low": 2,
            "open": 2,
            "time": "2022-01-01 09:33",
            "volume": 0,
          },
          Object {
            "close": 2,
            "high": 2,
            "low": 2,
            "open": 2,
            "time": "2022-01-01 09:34",
            "volume": 0,
          },
          Object {
            "close": 2,
            "high": 2,
            "low": 2,
            "open": 2,
            "time": "2022-01-01 09:35",
            "volume": 0,
          },
        ],
        "m5": Array [
          Object {
            "close": 2,
            "high": 2,
            "low": 1,
            "open": 1,
            "time": "2022-01-01 09:30",
            "volume": 1,
          },
          Object {
            "close": 2,
            "high": 2,
            "low": 2,
            "open": 2,
            "time": "2022-01-01 09:35",
            "volume": 0,
          },
        ],
      }
    `);
  });

  test('updating the same bar multiple times should not over count the volume', () => {
    const tracker = initTracker();

    const updateBar = ({volume}: {volume: number}) => {
      const marketOpen = getMarketOpen(getTestDate());
      const marketClose = getMarketClose(getTestDate());

      // Update a bar
      handleTrackerMinuteBar({
        data: tracker,
        bar: {
          open: 1,
          high: 1,
          low: 1,
          close: 1,
          volume: volume,
          time: formatBarTime(Periods.m1, createTimeAsUnix('09:30')),
        },
        marketTime: createTimeAsUnix('09:30'),
        marketOpen,
        marketClose,
      });
    };

    // Update the bar data
    updateBar({volume: 1});
    expect(tracker.bars.m1[0].volume).toEqual(1);
    expect(tracker.bars.m5[0].volume).toEqual(1);
    expect(tracker.bars.daily[0].volume).toEqual(1);

    // Update again, volume should be the same
    updateBar({volume: 1});
    expect(tracker.bars.m1[0].volume).toEqual(1);
    expect(tracker.bars.m5[0].volume).toEqual(1);
    expect(tracker.bars.daily[0].volume).toEqual(1);

    // Update volume to 2
    updateBar({volume: 2});
    expect(tracker.bars.m1[0].volume).toEqual(2);
    expect(tracker.bars.m5[0].volume).toEqual(2);
    expect(tracker.bars.daily[0].volume).toEqual(2);

    // Update volume to 10
    updateBar({volume: 10});
    expect(tracker.bars.m1[0].volume).toEqual(10);
    expect(tracker.bars.m5[0].volume).toEqual(10);
    expect(tracker.bars.daily[0].volume).toEqual(10);

    // Back to 5 should not reduce the volume
    updateBar({volume: 5});
    expect(tracker.bars.m1[0].volume).toEqual(10);
    expect(tracker.bars.m5[0].volume).toEqual(10);
    expect(tracker.bars.daily[0].volume).toEqual(10);
  });

  test('set last from bar data', () => {
    const tracker = initTracker();

    const marketOpen = getMarketOpen(getTestDate());
    const marketClose = getMarketClose(getTestDate());

    // Update a bar
    handleTrackerMinuteBar({
      data: tracker,
      bar: {
        open: 1,
        high: 2,
        low: 1,
        close: 2,
        volume: 1,
        time: formatBarTime(Periods.m1, createTimeAsUnix('10:00')),
      },
      marketTime: createTimeAsUnix('10:00'),
      marketOpen,
      marketClose,
    });

    expect(tracker.last).toEqual(2);

    handleTrackerMinuteBar({
      data: tracker,
      bar: {
        open: 1,
        high: 2,
        low: 1,
        close: 1,
        volume: 1,
        time: formatBarTime(Periods.m1, createTimeAsUnix('10:01')),
      },
      marketTime: createTimeAsUnix('10:01'),
      marketOpen,
      marketClose,
    });

    expect(tracker.last).toEqual(1);
  });
});
