import {ensureDataIsAvailable} from '../../utils/data-storage';
import {getTestDate} from '../test-utils/tick';

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
      init: jest.fn(async () => {}),
      getTimeSeries: jest.fn(async () => {
        return [
          {
            open: 1,
            high: 1,
            low: 1,
            close: 1,
            volume: 1,
            time: 'TODO',
          },
        ];
      }),
    };
    createDataProviderMock.mockReturnValue(mockProvider);

    await ensureDataIsAvailable({
      symbols: ['ZZZZ'],
      dates: [getTestDate()],
      log: () => {},
    });

    // Check variables
    expect(mockProvider.getTimeSeries).toBeCalledWith(
      'ZZZZ',
      getTestDate(),
      'm1',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      'ZZZZ',
      getTestDate(),
      'm60',
    );

    expect(mockProvider.getTimeSeries).toBeCalledWith(
      'ZZZZ',
      getTestDate(),
      'daily',
    );
  });
});
