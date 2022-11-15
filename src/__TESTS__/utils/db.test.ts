import {addMinutes} from 'date-fns';

import {BacktestResults} from '../../backtest/controller';
import {Instrument} from '../../core';
import {formatDateTime} from '../../utils/dates';
import {
  connect,
  disconnect,
  getBacktest,
  getBacktests,
  resetDatabase,
  storeBacktestResults,
  instrumentLookup,
  storeInstrument,
  getInstrument,
  storeSeries,
  loadBars,
  loadMinuteDataForDate,
  loadTrackerBars,
} from '../../utils/db';

import {getTestDate} from '../test-utils/tick';

describe('mongo db tests', () => {
  function getBarData(minutes: number) {
    return {
      time: formatDateTime(addMinutes(getTestDate(), minutes)),
      open: minutes,
      high: minutes,
      low: minutes,
      close: minutes,
      volume: minutes,
    };
  }

  beforeAll(async () => {
    // Reset the test database
    await resetDatabase();

    // Connect again
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  test('connecting to test database', async () => {
    // Load some results
    const backtests = await getBacktests();

    // No tests have been saved yet
    expect(backtests.length).toBe(0);
  });

  test('storing backtest results', async () => {
    const symbol = 'ZZZZ';

    const results: BacktestResults = {
      createdAt: getTestDate(),
      positions: [
        {
          symbol,
          closeReason: 'test',
          isClosing: false,
          openedAt: getTestDate(),
          closedAt: null,
          size: 0,
          data: {
            data1: '123',
          },
          orders: [
            {
              id: 1,
              type: 'MKT',
              symbol,
              action: 'BUY',
              shares: 100,
              state: 'FILLED',
              avgFillPrice: 123,
              openedAt: getTestDate(),
              filledAt: getTestDate(),
              executions: {},
            },
          ],
        },
      ],
      profile: {
        strategy: {
          name: 'hod',
          source: 'test',
        },
        threads: 1,
        dates: {
          from: getTestDate(),
          to: getTestDate(),
          dates: [getTestDate()],
        },
        symbols: ['MSFT'],
        extraSymbols: [],
        initialBalance: 1000,
        commissionPerOrder: 1,
      },
    };

    // Store the results
    await storeBacktestResults(results);

    // Make sure the results are the same
    const [storedBacktest] = await getBacktests();

    expect(storedBacktest).toMatchObject(results);

    // get an individual backtest
    const storedSingleBacktest = await getBacktest(
      storedBacktest._id?.toString() || '',
    );
    expect(storedSingleBacktest).toMatchObject(results);
  });

  test('load and save instruments to db', async () => {
    const provider = 'test';

    const testInstruments: Instrument[] = [
      {
        externalId: 'AAAA',
        symbol: 'AAAA',
        name: 'AAAA INC',
        data: {
          contractId: 123,
          exchange: 'nyse',
        },
      },
      {
        externalId: 'BBBB',
        symbol: 'BBBB',
        name: 'BBBB INC',
        data: {
          contractId: 123,
          exchange: 'nyse',
        },
      },
    ];

    const emptyLookups = await instrumentLookup({
      provider,
      symbols: testInstruments.map(i => i.symbol),
    });

    expect(emptyLookups.length).toBe(0);

    // Store the instruments
    await storeInstrument({
      provider,
      instrument: testInstruments[0],
    });

    const firstLookups = await instrumentLookup({
      provider,
      symbols: testInstruments.map(i => i.symbol),
    });

    expect(firstLookups.length).toBe(1);
    expect(firstLookups[0]).toMatchObject(testInstruments[0]);
  });

  test('load an instrument from db', async () => {
    const provider = 'test';

    const instrument: Instrument = {
      externalId: 'AAAA',
      symbol: 'AAAA',
      name: 'AAAA INC',
      data: {
        contractId: 123,
        exchange: 'nyse',
      },
    };

    // Store the instruments
    await storeInstrument({
      provider,
      instrument,
    });

    // Test finding an instrument with instrument
    const storedInstrument = await getInstrument({
      provider,
      symbol: instrument.symbol,
    });

    expect(storedInstrument?.symbol).toBe(instrument.symbol);
    expect(storedInstrument?.name).toBe(instrument.name);
  });

  test('store the same instrument multiple times', async () => {
    const provider = 'test';

    const instrument: Instrument = {
      externalId: 'DUPLICATE',
      symbol: 'DUPLICATE',
      name: 'DUPLICATE INC',
      data: {
        contractId: 123,
        exchange: 'nyse',
      },
    };

    // Store the instruments
    await storeInstrument({
      provider,
      instrument,
    });

    await storeInstrument({
      provider,
      instrument,
    });

    // Test finding an instrument with instrument
    const storedInstrument = await getInstrument({
      provider,
      symbol: instrument.symbol,
    });

    expect(storedInstrument?.symbol).toBe(instrument.symbol);
    expect(storedInstrument?.name).toBe(instrument.name);
  });

  test('load bar data for invalid instrument', async () => {
    const bars = await loadBars('INVALID', 'm1', getTestDate(), 1);
    expect(bars).toEqual([]);
  });

  test('store and load series', async () => {
    await storeSeries('TEST_1', 'm1', [
      getBarData(-3),
      getBarData(-2),
      getBarData(-1),
      getBarData(0),
      getBarData(1),
    ]);

    const bars = await loadBars('TEST_1', 'm1', getTestDate(), 10);

    expect(bars.length).toEqual(3);

    expect(bars).toMatchInlineSnapshot(`
      Array [
        Object {
          "close": -3,
          "high": -3,
          "low": -3,
          "open": -3,
          "time": "2021-12-31 23:57",
          "volume": -3,
        },
        Object {
          "close": -2,
          "high": -2,
          "low": -2,
          "open": -2,
          "time": "2021-12-31 23:58",
          "volume": -2,
        },
        Object {
          "close": -1,
          "high": -1,
          "low": -1,
          "open": -1,
          "time": "2021-12-31 23:59",
          "volume": -1,
        },
      ]
    `);
  });

  test('loading bar data by date from the database', async () => {
    const emptyBars = await loadMinuteDataForDate('INVALID', getTestDate());
    expect(Object.keys(emptyBars).length).toBe(0);

    await storeSeries('TEST_2', 'm1', [
      getBarData(-3),
      getBarData(-2),
      getBarData(-1),
      getBarData(0),
      getBarData(1),
    ]);

    const barsByDate = await loadMinuteDataForDate('TEST_2', getTestDate());

    // Make sure we have all the data
    expect(barsByDate).toMatchInlineSnapshot(`
      Object {
        "2022-01-01 00:00": Object {
          "close": 0,
          "high": 0,
          "low": 0,
          "open": 0,
          "time": "2022-01-01 00:00",
          "volume": 0,
        },
        "2022-01-01 00:01": Object {
          "close": 1,
          "high": 1,
          "low": 1,
          "open": 1,
          "time": "2022-01-01 00:01",
          "volume": 1,
        },
      }
    `);
  });

  test('load full tracker bars for a symbol', async () => {
    // No data to start with
    expect(await loadTrackerBars('TEST_3', getTestDate(), 3))
      .toMatchInlineSnapshot(`
      Object {
        "daily": Array [],
        "m1": Array [],
        "m5": Array [],
      }
    `);

    await storeSeries('TEST_3', 'm1', [
      getBarData(-5),
      getBarData(-6),
      getBarData(-3),
      getBarData(-2),
      getBarData(-1),
      getBarData(0),
      getBarData(1),
    ]);

    // Only load m1 data for last 3 bars
    expect(await loadTrackerBars('TEST_3', getTestDate(), 3))
      .toMatchInlineSnapshot(`
      Object {
        "daily": Array [],
        "m1": Array [
          Object {
            "close": -3,
            "high": -3,
            "low": -3,
            "open": -3,
            "time": "2021-12-31 23:57",
            "volume": -3,
          },
          Object {
            "close": -2,
            "high": -2,
            "low": -2,
            "open": -2,
            "time": "2021-12-31 23:58",
            "volume": -2,
          },
          Object {
            "close": -1,
            "high": -1,
            "low": -1,
            "open": -1,
            "time": "2021-12-31 23:59",
            "volume": -1,
          },
        ],
        "m5": Array [],
      }
    `);
  });
});
