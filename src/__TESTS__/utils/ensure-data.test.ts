import {
  findLastNonRequestedDateForPeriod,
  findFirstNonRequestedDateForPeriod,
  recordDataHasBeenRequested,
  hasRequestedData,
  connect,
  disconnect,
  resetDatabase,
} from '../../utils/db';

describe('test data availability', () => {
  beforeAll(async () => {
    // Reset the test database
    await resetDatabase();

    // Connect again
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  test('load and save instruments to db', async () => {
    expect(await hasRequestedData('AAPL', 'm1', new Date('2019-01-01'))).toBe(
      false,
    );
  });
});
