import {runBacktest} from '../../backtest/worker';
import {loadBacktestProfile} from '../../utils/profile';
import {
  createTimeAsDate,
  createTimeAsUnix,
  getTestDate,
} from '../test-utils/tick';
import {connect, disconnect} from '../../utils/db';

import {loadTickForMinute} from '../../utils/tick-storage';

jest.mock('../../utils/tick-storage');

const loadTickForSymbolAndDateMock = loadTickForMinute as jest.MockedFunction<
  typeof loadTickForMinute
>;

describe.skip('test worker module', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(() => {
    // Do we need this? it causes issues with Mongoose
    // jest.resetModules();
  });

  test('fail to run with missing data', async () => {
    const profile = await loadBacktestProfile('sample');

    await expect(
      async () =>
        await runBacktest({
          profile: {
            ...profile,
          },
          symbol: 'MSFT',
          date: getTestDate(),
          log: () => {},
          workerIndex: 0,
          fetchOnly: false,
        }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"no-symbol-data"`);
  });

  test('worker with valid profile and strategy', async () => {
    const profile = await loadBacktestProfile('sample');

    loadTickForSymbolAndDateMock.mockResolvedValue([
      {
        symbol: 'MSFT',
        type: 'ASK',
        value: 1,
        size: 1,
        index: 0,
        time: createTimeAsUnix('09:30'),
        dateTime: createTimeAsDate('09:30'),
      },
      {
        symbol: 'MSFT',
        type: 'BID',
        value: 1,
        size: 1,
        index: 0,
        time: createTimeAsUnix('09:30'),
        dateTime: createTimeAsDate('09:30'),
      },
      {
        symbol: 'MSFT',
        type: 'TRADE',
        value: 1,
        size: 1,
        index: 0,
        time: createTimeAsUnix('09:31'),
        dateTime: createTimeAsDate('09:31'),
      },
    ]);

    const data = await runBacktest({
      profile: {
        ...profile,
      },
      symbol: 'MSFT',
      date: getTestDate(),
      log: () => {},
      workerIndex: 0,
      fetchOnly: false,
    });

    expect(data).toMatchInlineSnapshot(`Array []`);
    loadTickForSymbolAndDateMock.mockClear();
  });

  test('worker with valid profile and strategy but invalid data', async () => {
    const profile = await loadBacktestProfile('sample');

    loadTickForSymbolAndDateMock.mockResolvedValue([
      {
        symbol: 'ZZZZ',
        type: 'ASK',
        value: 1,
        size: 1,
        index: 0,
        time: createTimeAsUnix('09:30'),
        dateTime: createTimeAsDate('09:30'),
      },
      {
        symbol: 'ZZZZ',
        type: 'BID',
        value: 1,
        size: 1,
        index: 0,
        time: createTimeAsUnix('09:30'),
        dateTime: createTimeAsDate('09:30'),
      },
      {
        symbol: 'ZZZZ',
        type: 'TRADE',
        value: 1,
        size: 1,
        index: 0,
        time: createTimeAsUnix('09:31'),
        dateTime: createTimeAsDate('09:31'),
      },
    ]);

    await expect(
      async () =>
        await runBacktest({
          profile: {
            ...profile,
          },
          symbol: 'MSFT',
          date: getTestDate(),
          log: () => {},
          workerIndex: 0,
          fetchOnly: false,
        }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"invalid-symbol-data"`);
  });

  test('fail to run with an invalid strategy', async () => {
    const profile = await loadBacktestProfile('sample');

    await expect(
      async () =>
        await runBacktest({
          profile: {
            ...profile,
            strategy: {
              name: 'invalid',
              source: null,
            },
          },
          symbol: 'MSFT',
          date: getTestDate(),
          log: () => {},
          workerIndex: 0,
          fetchOnly: false,
        }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"strategy-not-found"`);
  });
});
