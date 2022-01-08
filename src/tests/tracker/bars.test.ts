import {startOfToday} from 'date-fns';

import {initTracker, updateTracker} from '../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../utils/market';

import {createTick, createTime} from '../utils/tick';

test('1m bars', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

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

  expect(data.bars[1]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 2,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 100,
      },
    ]
  `);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 2.1,
      size: 100,
    }),
  });

  expect(data.bars[1]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2.1,
        "high": 2.1,
        "low": 2,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 200,
      },
    ]
  `);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 2.2,
      size: 100,
    }),
  });

  expect(data.bars[1]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2.2,
        "high": 2.2,
        "low": 2,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 300,
      },
    ]
  `);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:30'),
      type: 'TRADE',
      value: 1.9,
      size: 100,
    }),
  });

  expect(data.bars[1]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 1.9,
        "high": 2.2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 400,
      },
    ]
  `);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:31'),
      type: 'TRADE',
      value: 2.1,
      size: 100,
    }),
  });

  expect(data.bars[1]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 1.9,
        "high": 2.2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 400,
      },
      Object {
        "close": 2.1,
        "high": 2.1,
        "low": 2.1,
        "open": 2.1,
        "time": "2022-01-08 09:31",
        "volume": 100,
      },
    ]
  `);
});

test('5m bars', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

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

  expect(data.bars[5]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 2,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 100,
      },
    ]
  `);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:31'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:31'),
      type: 'TRADE',
      value: 1.9,
      size: 100,
    }),
  });

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:31'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  expect(data.bars[5]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 400,
      },
    ]
  `);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: createTime('09:36'),
      type: 'TRADE',
      value: 2,
      size: 100,
    }),
  });

  expect(data.bars[5]).toMatchInlineSnapshot(`
    Array [
      Object {
        "close": 2,
        "high": 2,
        "low": 1.9,
        "open": 2,
        "time": "2022-01-08 09:30",
        "volume": 400,
      },
      Object {
        "close": 2,
        "high": 2,
        "low": 2,
        "open": 2,
        "time": "2022-01-08 09:35",
        "volume": 100,
      },
    ]
  `);
});
