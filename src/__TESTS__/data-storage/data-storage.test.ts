import {format, parse} from 'date-fns';

import {ensureDataIsAvailable} from '../../utils/data-storage';
import {getTestDate} from '../test-utils/tick';
import Env from '../../utils/env';

import {connect, disconnect, resetDatabase} from '../../utils/db';

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
      getTimeSeries: jest.fn(async (symbol: string, from: Date) => {
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

    await ensureDataIsAvailable({
      dataProvider,
      symbols: ['ZZZZ'],
      log: () => {},
      until: getTestDate(),
    });

    const earliestDataDate = parse(Env.EARLIEST_DATA, 'yyyy-MM-dd', new Date());

    // Check variables
    expect(mockProvider.getTimeSeries).toBeCalledWith(
      'ZZZZ',
      earliestDataDate,
      getTestDate(),
      'm1',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      'ZZZZ',
      earliestDataDate,
      getTestDate(),
      'm60',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      'ZZZZ',
      earliestDataDate,
      getTestDate(),
      'daily',
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
