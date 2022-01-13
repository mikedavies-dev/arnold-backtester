import {runBacktest} from '../../backtest/worker';
import {loadProfile} from '../../utils/profile';
import {
  createTimeAsDate,
  createTimeAsUnix,
  getTestDate,
} from '../test-utils/tick';

import {loadTsForSymbolAndDate} from '../../utils/data';

jest.mock('../../utils/data');

const loadTsForSymbolAndDateMock =
  loadTsForSymbolAndDate as jest.MockedFunction<typeof loadTsForSymbolAndDate>;

describe('test worker module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('fail to run with missing data', async () => {
    const profile = await loadProfile('sample');

    await expect(
      async () =>
        await runBacktest({
          profile: {
            ...profile,
          },
          symbol: 'MSFT',
          date: getTestDate(),
          log: () => {},
        }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"no-symbol-data"`);
  });

  test('worker with valid profile and strategy', async () => {
    const profile = await loadProfile('sample');

    loadTsForSymbolAndDateMock.mockResolvedValue([
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
    });

    expect(data).toMatchInlineSnapshot(`Array []`);
    loadTsForSymbolAndDateMock.mockClear();
  });

  test('worker with valid profile and strategy but invalid data', async () => {
    const profile = await loadProfile('sample');

    loadTsForSymbolAndDateMock.mockResolvedValue([
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
        }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"invalid-symbol-data"`);
  });

  test('fail to run with an invalid strategy', async () => {
    const profile = await loadProfile('sample');

    await expect(
      async () =>
        await runBacktest({
          profile: {
            ...profile,
            strategy: 'invalid',
          },
          symbol: 'MSFT',
          date: getTestDate(),
          log: () => {},
        }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"strategy-not-found"`);
  });
});
