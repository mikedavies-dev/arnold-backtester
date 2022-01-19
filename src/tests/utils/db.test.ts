import {
  connect,
  disconnect,
  getBacktests,
  resetDatabase,
  storeBacktestResults,
} from '../../utils/db';

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
    await storeBacktestResults({
      positions: [],
    });
  });
});
