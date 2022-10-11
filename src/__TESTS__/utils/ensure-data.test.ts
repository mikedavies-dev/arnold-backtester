import mongoose from 'mongoose';

import {addDays, subDays} from 'date-fns';
import {
  findNonRequestedRangeForPeriod,
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

  beforeEach(async () => {
    // Delete availability data for symbols used in this test
    await mongoose.connection.db
      .collection('timeseries_data_availability')
      .deleteMany({
        symbol: 'ENSURE_DATA_TEST_SYMBOL',
      });
  });

  test('record requesting data', async () => {
    const date = new Date('2019-01-01');
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    // make sure we have not requested the data
    expect(await hasRequestedData(symbol, period, date)).toBe(false);

    // record that we requested the data
    await recordDataHasBeenRequested(symbol, period, date);

    // makes sure it was recorded
    expect(await hasRequestedData(symbol, period, date)).toBe(true);
  });

  test('finding the first and last without any saved values', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-05');

    const range = await findNonRequestedRangeForPeriod(
      symbol,
      period,
      from,
      to,
    );

    expect(range?.from).toEqual(from);
    expect(range?.to).toEqual(to);
  });

  test('increment first day', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-05');

    await recordDataHasBeenRequested(symbol, period, from);

    const range = await findNonRequestedRangeForPeriod(
      symbol,
      period,
      from,
      to,
    );

    expect(range?.from).toEqual(addDays(from, 1));
    expect(range?.to).toEqual(to);
  });

  test('decrement last day', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-05');

    await recordDataHasBeenRequested(symbol, period, to);

    const range = await findNonRequestedRangeForPeriod(
      symbol,
      period,
      from,
      to,
    );

    expect(range?.from).toEqual(from);
    expect(range?.to).toEqual(subDays(to, 1));
  });

  test('choose middle date', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-05');

    await recordDataHasBeenRequested(symbol, period, to);
    await recordDataHasBeenRequested(symbol, period, subDays(to, 1));

    const range = await findNonRequestedRangeForPeriod(
      symbol,
      period,
      from,
      to,
    );

    expect(range?.from).toEqual(from);
    expect(range?.to).toEqual(subDays(to, 2));
  });

  test('same start and end date', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-01');

    const range = await findNonRequestedRangeForPeriod(
      symbol,
      period,
      from,
      to,
    );

    expect(range?.from).toEqual(from);
    expect(range?.to).toEqual(to);
  });

  test('same start and end date having requested data', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-01');

    await recordDataHasBeenRequested(symbol, period, to);

    const range = await findNonRequestedRangeForPeriod(
      symbol,
      period,
      from,
      to,
    );

    expect(range).toBe(null);
  });

  test('have requested all days', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-03');

    expect(await findNonRequestedRangeForPeriod(symbol, period, from, to))
      .toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-01T00:00:00.000Z,
        "to": 2019-02-03T00:00:00.000Z,
      }
    `);

    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-01'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-02'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-03'));

    // We've requested all the data so the range should be null
    expect(await findNonRequestedRangeForPeriod(symbol, period, from, to)).toBe(
      null,
    );
  });

  test('have requested all days', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-10');

    expect(await findNonRequestedRangeForPeriod(symbol, period, from, to))
      .toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-01T00:00:00.000Z,
        "to": 2019-02-10T00:00:00.000Z,
      }
    `);

    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-04'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-07'));

    expect(await findNonRequestedRangeForPeriod(symbol, period, from, to))
      .toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-01T00:00:00.000Z,
        "to": 2019-02-10T00:00:00.000Z,
      }
    `);

    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-01'));

    expect(await findNonRequestedRangeForPeriod(symbol, period, from, to))
      .toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-02T00:00:00.000Z,
        "to": 2019-02-10T00:00:00.000Z,
      }
    `);

    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-02'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-03'));

    expect(await findNonRequestedRangeForPeriod(symbol, period, from, to))
      .toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-05T00:00:00.000Z,
        "to": 2019-02-10T00:00:00.000Z,
      }
    `);
  });

  test('have requested all days', async () => {
    const symbol = 'ENSURE_DATA_TEST_SYMBOL';
    const period = 'm1';

    const from = new Date('2019-02-01');
    const to = new Date('2019-02-10');

    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-01'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-02'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-03'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-04'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-05'));

    expect(await findNonRequestedRangeForPeriod(symbol, period, from, to))
      .toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-06T00:00:00.000Z,
        "to": 2019-02-10T00:00:00.000Z,
      }
    `);

    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-06'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-07'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-08'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-09'));
    await recordDataHasBeenRequested(symbol, period, new Date('2019-02-10'));

    expect(
      await findNonRequestedRangeForPeriod(symbol, period, from, to),
    ).toMatchInlineSnapshot(`null`);

    expect(
      await findNonRequestedRangeForPeriod(
        symbol,
        period,
        from,
        addDays(to, 1),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-11T00:00:00.000Z,
        "to": 2019-02-11T00:00:00.000Z,
      }
    `);

    expect(
      await findNonRequestedRangeForPeriod(
        symbol,
        period,
        addDays(from, 1),
        addDays(to, 1),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "from": 2019-02-11T00:00:00.000Z,
        "to": 2019-02-11T00:00:00.000Z,
      }
    `);

    expect(
      await findNonRequestedRangeForPeriod(
        symbol,
        period,
        subDays(from, 1),
        addDays(to, 1),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "from": 2019-01-31T00:00:00.000Z,
        "to": 2019-02-11T00:00:00.000Z,
      }
    `);

    expect(
      await findNonRequestedRangeForPeriod(symbol, period, from, from),
    ).toMatchInlineSnapshot(`null`);
  });
});
