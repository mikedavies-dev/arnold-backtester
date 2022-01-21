import {BacktestResults} from '../../../backtest/controller';
import {
  connect,
  disconnect,
  getBacktests,
  resetDatabase,
  storeBacktestResults,
} from '../../../utils/db';

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
      },
    };

    // Store the results
    await storeBacktestResults(results);

    // Make sure the results are the same
    const [storedBacktest] = await getBacktests();
    expect(storedBacktest.toJSON()).toMatchObject(results);
  });
});
