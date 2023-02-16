import {create as createPolygon} from '../../../utils/data-provider/providers/polygonio';
import {Instrument} from '../../../core';
import {getTestDate} from '../../testing/tick';

const microsoft = {
  externalId: 'MSFT@XNAS',
  symbol: 'MSFT',
  name: 'Microsoft Corp',
  data: {
    ticker: 'MSFT',
    name: 'Microsoft Corp',
    market: 'stocks',
    locale: 'us',
    primary_exchange: 'XNAS',
    type: 'CS',
    active: true,
    currency_name: 'usd',
    cik: '0000789019',
    composite_figi: 'BBG000BPH459',
    share_class_figi: 'BBG001S5TD05',
    last_updated_utc: '2023-02-13T00:00:00Z',
  },
};

describe('test the polygonio data provider', () => {
  test('instrument lookups', async () => {
    const polygon = createPolygon();
    await polygon.init();
    const results = await polygon.instrumentLookup('MSFT');

    expect(
      results.find(r => r.name.indexOf('Microsoft Corp') !== -1),
    ).toBeTruthy();

    await polygon.shutdown();
  });

  test('request m1 bar data', async () => {
    const polygon = createPolygon();
    await polygon.init();

    // 1 min
    const m1 = await polygon.getTimeSeries(
      microsoft as Instrument,
      getTestDate(),
      2,
      'm1',
    );

    expect(m1.length).toBe(1062);
    expect(m1[0]).toMatchInlineSnapshot(`
      {
        "close": 341.94,
        "high": 342.23,
        "low": 341.94,
        "open": 342.02,
        "time": "2021-12-30 04:19:00",
        "volume": 2028,
      }
    `);

    // Close the connection
    await polygon.shutdown();
  });

  test('request m5 bar data', async () => {
    const polygon = createPolygon();
    await polygon.init();

    // 5 mins
    const bars = await polygon.getTimeSeries(
      microsoft as Instrument,
      getTestDate(),
      10,
      'm5',
    );

    expect(bars.length).toEqual(1059);
    expect(bars[0]).toMatchInlineSnapshot(`
      {
        "close": 326.75,
        "high": 326.75,
        "low": 326.75,
        "open": 326.75,
        "time": "2021-12-22 04:10:00",
        "volume": 759,
      }
    `);

    // Close the connection
    await polygon.shutdown();
  });

  test('request daily bar data', async () => {
    const polygon = createPolygon();
    await polygon.init();

    // Daily data
    const bars = await polygon.getTimeSeries(
      microsoft as Instrument,
      getTestDate(),
      10,
      'daily',
    );
    expect(bars.length).toEqual(7);
    expect(bars[0]).toMatchInlineSnapshot(`
      {
        "close": 333.2,
        "high": 333.605,
        "low": 325.75,
        "open": 328.3,
        "time": "2021-12-22 00:00:00",
        "volume": 24831493,
      }
    `);

    // Close the connection
    await polygon.shutdown();
  });
});
