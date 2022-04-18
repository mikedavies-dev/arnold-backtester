import {subDays, addWeeks} from 'date-fns';

import {getTestDate} from '../../test-utils/tick';
import {
  create as createIB,
  splitDatesIntoBlocks,
} from '../../../utils/data-provider/providers/ib';
import Env from '../../../utils/env';
import {Instrument} from '../../../core';

test('split dates into block sizes', () => {
  // The same dates should not return anything
  const testSameDates = splitDatesIntoBlocks(
    getTestDate(),
    getTestDate(),
    'daily',
  );
  expect(testSameDates).toStrictEqual([]);

  // One week of daily data
  const testOneWeekOfDaily = splitDatesIntoBlocks(
    getTestDate(),
    addWeeks(getTestDate(), 1),
    'daily',
  );

  expect(testOneWeekOfDaily.length).toBe(1);
  expect(testOneWeekOfDaily[0].duration).toBe('7 D');

  // One week of daily data
  const testMinuteDate = splitDatesIntoBlocks(
    getTestDate(),
    addWeeks(getTestDate(), 1),
    'm1',
  );

  expect(testMinuteDate).toMatchInlineSnapshot(`
    Array [
      Object {
        "duration": "1 D",
        "end": "20220102 00:00:00",
      },
      Object {
        "duration": "1 D",
        "end": "20220104 00:00:00",
      },
      Object {
        "duration": "1 D",
        "end": "20220106 00:00:00",
      },
      Object {
        "duration": "1 D",
        "end": "20220108 00:00:00",
      },
    ]
  `);
});

// These tests require IB to be connected

if (!Env.DISABLE_PROVIDER_TESTS) {
  test('init ib', async () => {
    const ib = createIB();
    await ib.init();
    await ib.shutdown();
  });

  test('get timeseries', async () => {
    const ib = createIB();
    expect(Env.isTesting).toBeTruthy();
    expect(Env.IB_PORT).toMatchInlineSnapshot(`"4002"`);

    await ib.init();

    // get MS
    const results = await ib.instrumentLookup('MSFT');
    const microsoft = results.find(r => r.name === 'MICROSOFT CORP');
    expect(microsoft).toBeTruthy();

    const from = subDays(getTestDate(), 2);
    const to = getTestDate();
    const ts = await ib.getTimeSeries(
      microsoft as Instrument,
      from,
      to,
      'daily',
    );
    expect(ts).toMatchInlineSnapshot(`
      Array [
        Object {
          "close": 338.07,
          "high": 343.13,
          "low": 337.11,
          "open": 342.02,
          "time": "2021-12-30 00:00:00",
          "volume": 116845,
        },
        Object {
          "close": 336.79,
          "high": 339.36,
          "low": 335.85,
          "open": 338,
          "time": "2021-12-31 00:00:00",
          "volume": 137656,
        },
      ]
    `);
    await ib.shutdown();
  });

  test('instrument lookups', async () => {
    const ib = createIB();
    await ib.init();
    const results = await ib.instrumentLookup('MSFT');

    expect(results.find(r => r.name === 'MICROSOFT CORP')).toBeTruthy();
    await ib.shutdown();
  });
}
