import {addDays} from 'date-fns';
import del from 'del';

import {
  Instrument,
  DownloadTickDataArgs,
  TickFileType,
  TimeSeriesPeriods,
  StoredTick,
} from '../../core';
import {ensureBarDataIsAvailable} from '../../utils/data-storage';
import {
  hasTickForMinute,
  loadTickForMinute,
  ensureTickDataIsAvailable,
} from '../../utils/tick-storage';

import {formatDateTime} from '../../utils/dates';

import {getTestDate} from '../test-utils/tick';
import Env from '../../utils/env';

import {
  connect,
  disconnect,
  resetDatabase,
  storeInstrument,
} from '../../utils/db';

jest.mock('../../utils/data-provider');

// Mocks
import {createDataProvider} from '../../utils/data-provider';

const createDataProviderMock = createDataProvider as jest.MockedFunction<
  typeof createDataProvider
>;

describe('mongo db tests', () => {
  beforeAll(async () => {
    // Reset the test database
    await resetDatabase();

    // Connect again
    await connect();
  });

  afterAll(async () => {
    await disconnect();

    createDataProviderMock.mockReset();
  });

  afterEach(async () => {
    // Delete test data
    await del(Env.getUserPath('data/ZZZZ'));
  });

  const testDate = getTestDate();
  const startTime = testDate.getTime() / 1000;
  const symbol = 'ZZZZ';

  const tradeTickData: StoredTick[] = [
    {
      symbol,
      dateTime: testDate,
      time: startTime + 0,
      index: 0,
      type: 'TRADE',
      value: 100,
      size: 1,
    },
    {
      symbol,
      dateTime: testDate,
      time: startTime + 2,
      index: 0,
      type: 'TRADE',
      value: 101,
      size: 1,
    },
  ];

  const bidAskTickData: StoredTick[] = [
    {
      symbol,
      dateTime: testDate,
      time: startTime,
      index: 0,
      type: 'BID',
      value: 99,
      size: 1,
    },
    {
      symbol,
      dateTime: testDate,
      time: startTime + 1,
      index: 0,
      type: 'BID',
      value: 100,
      size: 1,
    },
    {
      symbol,
      dateTime: testDate,
      time: startTime + 3,
      index: 0,
      type: 'ASK',
      value: 101,
      size: 1,
    },
  ];

  test('loading bar data for an instrument', async () => {
    const mockProvider = {
      name: 'test',
      init: jest.fn(async () => {}),
      shutdown: jest.fn(async () => {}),
      getTimeSeries: jest.fn(async (instrument: Instrument, from: Date) => {
        return [
          {
            time: formatDateTime(from),
            open: 1,
            high: 1,
            low: 1,
            close: 1,
            volume: 1,
          },
        ];
      }),
      instrumentLookup: async () => [],
      downloadTickData: async () => {},
      subscribeMarketUpdates: () => 0,
      cancelMarketUpdates: () => {},
    };
    createDataProviderMock.mockReturnValue(mockProvider);

    const dataProvider = createDataProvider();

    const instrument = {
      externalId: 'ZZZZ',
      symbol: 'ZZZZ',
      name: 'ZZZZ',
      data: {},
    };

    // store the instrument
    await storeInstrument({
      provider: dataProvider.name,
      instrument,
    });

    const from = getTestDate();
    const to = addDays(from, 10);

    await ensureBarDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      from,
      to,
    });

    // Check variables
    expect(mockProvider.getTimeSeries).toBeCalledWith(
      expect.anything(),
      addDays(from, 1),
      1,
      'm1',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      expect.anything(),
      addDays(to, 1),
      expect.anything(),
      'm60',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      expect.anything(),
      addDays(from, 5),
      5,
      'm5',
    );

    const calls = mockProvider.getTimeSeries.mock.calls.length;

    // Call again
    await ensureBarDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      from,
      to,
    });

    // We should already have the data
    expect(mockProvider.getTimeSeries).toBeCalledTimes(calls);

    await ensureBarDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      from,
      to: addDays(to, 1),
    });

    // Make sure we were called for each period
    expect(mockProvider.getTimeSeries).toBeCalledTimes(
      calls + TimeSeriesPeriods.length,
    );
  });

  test('ensure tick data is available', async () => {
    const symbol = 'ZZZZ';

    const mockProvider = {
      name: 'test',
      init: jest.fn(async () => {}),
      shutdown: jest.fn(async () => {}),
      getTimeSeries: jest.fn(async () => {
        return [];
      }),
      instrumentLookup: async () => [],
      subscribeMarketUpdates: () => 0,
      cancelMarketUpdates: () => {},
      downloadTickData: jest.fn(
        async ({write, merge}: DownloadTickDataArgs) => {
          // Load/write bid/ask data from remove service
          await write(TickFileType.BidAsk, bidAskTickData);

          // Load trade data from remote service
          await write(TickFileType.Trades, tradeTickData);

          // Merge the two together
          await merge();
        },
      ),
    };
    createDataProviderMock.mockReturnValue(mockProvider);

    expect(await hasTickForMinute(symbol, getTestDate())).toBeFalsy();

    const dataProvider = createDataProvider();

    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: [symbol],
      log: () => {},
      minute: getTestDate(),
    });

    // We didn't have any data available so it should have been downloaded
    expect(mockProvider.downloadTickData).toBeCalledTimes(1);

    // Now we have data
    expect(await hasTickForMinute(symbol, getTestDate())).toBeTruthy();

    mockProvider.downloadTickData.mockReset();

    // If we make the call again we should not download data
    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: [symbol],
      log: () => {},
      minute: getTestDate(),
    });

    // We already have data so it should not have been called again
    expect(mockProvider.downloadTickData).toBeCalledTimes(0);

    // load the tick data
    const storedData = await loadTickForMinute(
      symbol,
      testDate,
      TickFileType.Merged,
    );

    expect(storedData).toMatchInlineSnapshot(`
      Array [
        Object {
          "dateTime": 2022-01-01T05:00:00.000Z,
          "index": 0,
          "size": 1,
          "symbol": "${symbol}",
          "time": 1641013200,
          "type": "BID",
          "value": 99,
        },
        Object {
          "dateTime": 2022-01-01T05:00:00.000Z,
          "index": 0,
          "size": 1,
          "symbol": "${symbol}",
          "time": 1641013200,
          "type": "TRADE",
          "value": 100,
        },
        Object {
          "dateTime": 2022-01-01T05:00:01.000Z,
          "index": 0,
          "size": 1,
          "symbol": "${symbol}",
          "time": 1641013201,
          "type": "BID",
          "value": 100,
        },
        Object {
          "dateTime": 2022-01-01T05:00:02.000Z,
          "index": 0,
          "size": 1,
          "symbol": "${symbol}",
          "time": 1641013202,
          "type": "TRADE",
          "value": 101,
        },
        Object {
          "dateTime": 2022-01-01T05:00:03.000Z,
          "index": 0,
          "size": 1,
          "symbol": "${symbol}",
          "time": 1641013203,
          "type": "ASK",
          "value": 101,
        },
      ]
    `);
  });

  test('that latest tick data dates are provided', async () => {
    const mockProvider = {
      name: 'test',
      init: jest.fn(async () => {}),
      shutdown: jest.fn(async () => {}),
      getTimeSeries: jest.fn(async () => {
        return [];
      }),
      instrumentLookup: async () => [],
      subscribeMarketUpdates: () => 0,
      cancelMarketUpdates: () => {},
      downloadTickData: jest.fn(async ({write}: DownloadTickDataArgs) => {
        // Load/write bid/ask data from remove service
        await write(TickFileType.BidAsk, bidAskTickData);

        // Load trade data from remote service
        await write(TickFileType.Trades, tradeTickData);
      }),
    };
    createDataProviderMock.mockReturnValue(mockProvider);

    const dataProvider = createDataProvider();

    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      minute: getTestDate(),
    });

    // If we make the call again we should not download data
    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      minute: getTestDate(),
    });
  });

  test('merging empty data should create the merged file', async () => {
    createDataProviderMock.mockReturnValue({
      name: 'test',
      init: jest.fn(async () => {}),
      shutdown: jest.fn(async () => {}),
      getTimeSeries: jest.fn(async () => {
        return [];
      }),
      instrumentLookup: async () => [],
      subscribeMarketUpdates: () => 0,
      cancelMarketUpdates: () => {},
      downloadTickData: jest.fn(async ({merge}: DownloadTickDataArgs) => {
        // Merge without writing first should create an empty merged file
        // so that next time we don't try downloading it
        await merge();
      }),
    });

    expect(await hasTickForMinute(symbol, getTestDate())).toBeFalsy();

    await ensureTickDataIsAvailable({
      dataProvider: createDataProvider(),
      symbols: ['ZZZZ'],
      log: () => {},
      minute: getTestDate(),
    });

    expect(await hasTickForMinute(symbol, getTestDate())).toBeTruthy();
  });
});
