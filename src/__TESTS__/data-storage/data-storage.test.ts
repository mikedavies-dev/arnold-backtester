import {format, parse, addDays} from 'date-fns';

import {Instrument} from '../../core';
import {ensureDataIsAvailable} from '../../utils/data-storage';
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

  test('check data storage', async () => {
    const mockProvider = {
      name: 'test',
      init: jest.fn(async () => {}),
      shutdown: jest.fn(async () => {}),
      getTimeSeriesBlock: jest.fn(
        async (instrument: Instrument, from: Date) => {
          return [
            {
              time: format(from, 'yyyy-MM-dd HH:mm:ss'),
              open: 1,
              high: 1,
              low: 1,
              close: 1,
              volume: 1,
            },
          ];
        },
      ),
      getTimeSeries: jest.fn(async (instrument: Instrument, from: Date) => {
        return [
          {
            time: format(from, 'yyyy-MM-dd HH:mm:ss'),
            open: 1,
            high: 1,
            low: 1,
            close: 1,
            volume: 1,
          },
        ];
      }),
      instrumentLookup: async () => [],
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

    await ensureDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      until: getTestDate(),
    });

    const earliestDataDate = parse(Env.EARLIEST_DATA, 'yyyy-MM-dd', new Date());

    // Check variables
    expect(mockProvider.getTimeSeriesBlock).toBeCalledWith(
      expect.anything(),
      addDays(earliestDataDate, 1),
      1,
      'm1',
    );

    expect(mockProvider.getTimeSeriesBlock).toBeCalledWith(
      expect.anything(),
      addDays(earliestDataDate, 60),
      60,
      'm60',
    );

    expect(mockProvider.getTimeSeriesBlock).toBeCalledWith(
      expect.anything(),
      addDays(earliestDataDate, 5),
      5,
      'm5',
    );

    mockProvider.getTimeSeries.mockReset();
    mockProvider.init.mockReset();

    // Call again
    await ensureDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      until: getTestDate(),
    });

    // We should already have the data
    expect(mockProvider.getTimeSeries).toBeCalledTimes(0);
  });
});
