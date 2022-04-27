import {parse, addDays} from 'date-fns';
import del from 'del';

import {Instrument, DownloadTickDataArgs, TickFileType, Tick} from '../../core';
import {ensureBarDataIsAvailable} from '../../utils/data-storage';
import {
  hasTickForSymbolAndDate,
  loadTickForSymbolAndDate,
  ensureTickDataIsAvailable,
  getLatestDateInTickData,
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
    await del(`${Env.DATA_FOLDER}/ZZZZ_*.csv`);
  });

  const testDate = getTestDate();
  const startTime = testDate.getTime() / 1000;
  const symbol = 'ZZZZ';

  const tradeTickData: Tick[] = [
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
      time: startTime + 60,
      index: 0,
      type: 'TRADE',
      value: 101,
      size: 1,
    },
  ];

  const bidAskTickData: Tick[] = [
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
      time: startTime + 30,
      index: 0,
      type: 'BID',
      value: 100,
      size: 1,
    },
    {
      symbol,
      dateTime: testDate,
      time: startTime + 90,
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
    };
    createDataProviderMock.mockReturnValue(mockProvider);

    const dataProvider = createDataProvider();

    const instrument = {
      symbol: 'ZZZZ',
      name: 'ZZZZ',
      data: {},
    };

    // store the instrument
    await storeInstrument({
      provider: dataProvider.name,
      instrument,
    });

    await ensureBarDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      until: getTestDate(),
    });

    const earliestDataDate = parse(Env.EARLIEST_DATA, 'yyyy-MM-dd', new Date());

    // Check variables
    expect(mockProvider.getTimeSeries).toBeCalledWith(
      expect.anything(),
      addDays(earliestDataDate, 1),
      1,
      'm1',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      expect.anything(),
      addDays(earliestDataDate, 60),
      60,
      'm60',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      expect.anything(),
      addDays(earliestDataDate, 5),
      5,
      'm5',
    );

    mockProvider.getTimeSeries.mockReset();
    mockProvider.init.mockReset();

    // Call again
    await ensureBarDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      until: getTestDate(),
    });

    // We should already have the data
    expect(mockProvider.getTimeSeries).toBeCalledTimes(0);
  });

  test('getting the latest date for a tick file', async () => {
    expect(
      await getLatestDateInTickData('YYYY', TickFileType.Merged, getTestDate()),
    ).toMatchInlineSnapshot(`2021-11-04T08:00:00.000Z`);

    expect(
      await getLatestDateInTickData('ZZZZ', TickFileType.Merged, getTestDate()),
    ).toMatchInlineSnapshot(`null`);
  });

  test('ensure tick data is available', async () => {
    const mockProvider = {
      name: 'test',
      init: jest.fn(async () => {}),
      shutdown: jest.fn(async () => {}),
      getTimeSeries: jest.fn(async () => {
        return [];
      }),
      instrumentLookup: async () => [],
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

    expect(await hasTickForSymbolAndDate('ZZZZ', getTestDate())).toBeFalsy();

    const dataProvider = createDataProvider();

    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      dates: [getTestDate()],
    });

    // We didn't have any data available so it should have been downloaded
    expect(mockProvider.downloadTickData).toBeCalledTimes(1);

    // Now we have data
    expect(await hasTickForSymbolAndDate('ZZZZ', getTestDate())).toBeTruthy();

    mockProvider.downloadTickData.mockReset();

    // If we make the call again we should not download data
    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      dates: [getTestDate()],
    });

    // We already have data so it should not have been called again
    expect(mockProvider.downloadTickData).toBeCalledTimes(0);

    // load the tick data
    const storedData = await loadTickForSymbolAndDate(
      symbol,
      testDate,
      TickFileType.Merged,
    );

    // Make sure the data looks good
    expect(storedData).toMatchInlineSnapshot(`
      Array [
        Object {
          "dateTime": 2022-01-01T05:00:00.000Z,
          "index": 0,
          "size": 1,
          "symbol": "ZZZZ",
          "time": 1641013200,
          "type": "BID",
          "value": 99,
        },
        Object {
          "dateTime": 2022-01-01T05:00:00.000Z,
          "index": 0,
          "size": 1,
          "symbol": "ZZZZ",
          "time": 1641013200,
          "type": "TRADE",
          "value": 100,
        },
        Object {
          "dateTime": 2022-01-01T05:00:30.000Z,
          "index": 0,
          "size": 1,
          "symbol": "ZZZZ",
          "time": 1641013230,
          "type": "BID",
          "value": 100,
        },
        Object {
          "dateTime": 2022-01-01T05:01:00.000Z,
          "index": 0,
          "size": 1,
          "symbol": "ZZZZ",
          "time": 1641013260,
          "type": "TRADE",
          "value": 101,
        },
        Object {
          "dateTime": 2022-01-01T05:01:30.000Z,
          "index": 0,
          "size": 1,
          "symbol": "ZZZZ",
          "time": 1641013290,
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
      dates: [getTestDate()],
    });

    mockProvider.downloadTickData = jest.fn(
      async ({latestDataDates}: DownloadTickDataArgs) => {
        expect(latestDataDates).toMatchInlineSnapshot(`
          Object {
            "bidask": 2022-01-01T05:01:30.000Z,
            "merged": null,
            "trades": 2022-01-01T05:01:00.000Z,
          }
        `);
      },
    );

    // If we make the call again we should not download data
    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      dates: [getTestDate()],
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
      downloadTickData: jest.fn(async ({merge}: DownloadTickDataArgs) => {
        // Merge without writing first should create an empty merged file
        // so that next time we don't try downloading it
        await merge();
      }),
    });

    expect(await hasTickForSymbolAndDate(symbol, getTestDate())).toBeFalsy();

    await ensureTickDataIsAvailable({
      dataProvider: createDataProvider(),
      symbols: ['ZZZZ'],
      log: () => {},
      dates: [getTestDate()],
    });

    expect(await hasTickForSymbolAndDate(symbol, getTestDate())).toBeTruthy();
  });
});
