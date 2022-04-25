import {parse, addDays} from 'date-fns';
import * as Fs from 'fs/promises';

import {Instrument, Tick} from '../../core';
import {ensureBarDataIsAvailable} from '../../utils/data-storage';
import {
  hasTickForSymbolAndDate,
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

    // Delete test data
    await Fs.rm(`${Env.DATA_FOLDER}/ZZZZ_20220101_merged.csv`);
  });

  test('check data storage', async () => {
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
        async (
          instrument: Instrument,
          date: Date,
          writeData: (ticks: Tick[]) => Promise<void>,
        ) => {
          writeData([
            {
              symbol: instrument.symbol,
              dateTime: date,
              time: date.getTime(),
              index: 0,
              type: 'TRADE',
              value: 100,
              size: 1,
            },
          ]);
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

    expect(mockProvider.downloadTickData).toBeCalledWith(
      expect.anything(),
      getTestDate(),
      expect.anything(),
    );

    expect(mockProvider.downloadTickData).toBeCalledTimes(1);
    expect(await hasTickForSymbolAndDate('ZZZZ', getTestDate())).toBeTruthy();

    mockProvider.downloadTickData.mockReset();

    // If we make the call again we should not download data
    await ensureTickDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      dates: [getTestDate()],
    });

    expect(mockProvider.downloadTickData).toBeCalledTimes(0);
  });
});
