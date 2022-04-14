import {BacktestResults} from '../../backtest/controller';
import {Instrument} from '../../core';
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
} from '../../utils/db';

import {getTestDate} from '../test-utils/tick';

describe('mongo db tests', () => {
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
        symbol: 'AAAA',
        name: 'AAAA INC',
        data: {
          contractId: 123,
          exchange: 'nyse',
        },
      },
      {
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
});
