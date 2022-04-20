import {Bar} from '../../../core';
import {getTestDate} from '../../test-utils/tick';
import {create as createIB} from '../../../utils/data-provider/providers/ib';
import Env from '../../../utils/env';
import {Instrument} from '../../../core';

const microsoft = {
  id: 272093,
  symbol: 'MSFT',
  name: 'MICROSOFT CORP',
  data: {
    symbol: 'MSFT',
    secType: 'STK',
    strike: 0,
    right: undefined,
    exchange: 'SMART',
    currency: 'USD',
    localSymbol: 'MSFT',
    tradingClass: 'NMS',
    conId: 272093,
    multiplier: 0,
    primaryExch: 'NASDAQ',
  },
};

function findDuplicates(bars: Bar[]) {
  // get the counts of each period and make sure we don't have duplicates
  const counts = bars.reduce<Map<string, number>>((acc, bar) => {
    acc.set(bar.time, (acc.get(bar.time) || 0) + 1);
    return acc;
  }, new Map());

  return Array.from(counts.keys())
    .map(time => ({
      time,
      count: counts.get(time) || 0,
    }))
    .filter(t => t.count > 1);
}

// These tests require IB to be connected
let nextClientId = 1000;
const originalClientId = Env.IB_CLIENT_ID_DATA_PROVIDER;

jest.setTimeout(60000);

if (Env.DISABLE_PROVIDER_TESTS) {
  test('ib sanity', () => {});
} else {
  test('init ib', async () => {
    const ib = createIB();
    await ib.init();
    await ib.shutdown();
  });

  beforeEach(() => {
    Env.IB_CLIENT_ID_DATA_PROVIDER = `${nextClientId++}`;
  });

  afterAll(() => {
    Env.IB_CLIENT_ID_DATA_PROVIDER = originalClientId;
  });

  test('request daily bar data', async () => {
    const ib = createIB();
    await ib.init();

    // Daily data
    const bars = await ib.getTimeSeries(
      microsoft as Instrument,
      getTestDate(),
      10,
      'daily',
    );
    expect(bars.length).toMatchInlineSnapshot(`10`);
    expect(findDuplicates(bars)).toStrictEqual([]);
    expect(bars[0]).toMatchInlineSnapshot(`
      Object {
        "close": 324.6,
        "high": 325.72,
        "low": 317.25,
        "open": 323.89,
        "time": "2021-12-17 00:00:00",
        "volume": 365910,
      }
    `);

    // Close the connection
    await ib.shutdown();
  });

  test('request m60 bar data', async () => {
    const ib = createIB();
    await ib.init();

    // 60 mins
    const bars = await ib.getTimeSeries(
      microsoft as Instrument,
      getTestDate(),
      10,
      'm60',
    );
    expect(bars.length).toMatchInlineSnapshot(`160`);
    expect(findDuplicates(bars)).toStrictEqual([]);
    expect(bars[0]).toMatchInlineSnapshot(`
      Object {
        "close": 322.86,
        "high": 324.83,
        "low": 321.85,
        "open": 323.89,
        "time": "2021-12-17 04:00:00",
        "volume": 100,
      }
    `);

    // Close the connection
    await ib.shutdown();
  });

  test('request m5 bar data', async () => {
    const ib = createIB();
    await ib.init();

    // 5 mins
    const bars = await ib.getTimeSeries(
      microsoft as Instrument,
      getTestDate(),
      10,
      'm5',
    );
    expect(bars.length).toMatchInlineSnapshot(`1912`);
    expect(bars[0]).toMatchInlineSnapshot(`
      Object {
        "close": 323.37,
        "high": 324.83,
        "low": 323.2,
        "open": 323.89,
        "time": "2021-12-17 04:00:00",
        "volume": 41,
      }
    `);
    expect(findDuplicates(bars)).toStrictEqual([]);

    // Close the connection
    await ib.shutdown();
  });

  test('request m1 bar data', async () => {
    const ib = createIB();
    await ib.init();

    // 1 min
    const m1 = await ib.getTimeSeries(
      microsoft as Instrument,
      getTestDate(),
      2,
      'm1',
    );
    expect(m1.length).toMatchInlineSnapshot(`1901`);
    expect(m1[0]).toMatchInlineSnapshot(`
      Object {
        "close": 341.94,
        "high": 342.23,
        "low": 341.94,
        "open": 342.02,
        "time": "2021-12-30 04:19:00",
        "volume": 18,
      }
    `);
    expect(findDuplicates(m1)).toStrictEqual([]);

    // Close the connection
    await ib.shutdown();
  });

  test('instrument lookups', async () => {
    const ib = createIB();
    Env.IB_CLIENT_ID_DATA_PROVIDER = `${nextClientId++}`;
    await ib.init();
    const results = await ib.instrumentLookup('MSFT');

    expect(
      results.find(r => r.name.indexOf('MICROSOFT CORP') !== -1),
    ).toBeTruthy();
    await ib.shutdown();
  });
}
