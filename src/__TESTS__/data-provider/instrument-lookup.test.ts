jest.mock('../../utils/data-provider');

import {createDataProvider} from '../../utils/data-provider';

const createDataProviderMock = createDataProvider as jest.MockedFunction<
  typeof createDataProvider
>;

test('instrument lookup', async () => {
  const mockProvider = {
    name: 'test',
    init: jest.fn(async () => {}),
    shutdown: jest.fn(async () => {}),
    getTimeSeries: async () => [],
    downloadTickData: async () => {},
    instrumentLookup: async () => [
      {
        externalId: 'ABCD',
        symbol: 'ABCD',
        name: 'ABCD INC',
        exchange: 'NYSE',
        data: null,
      },
      {
        externalId: 'ABCD2',
        symbol: 'ABCD v2',
        name: 'ABCD v2 INC',
        exchange: 'NYSE',
        data: null,
      },
    ],
  };
  createDataProviderMock.mockReturnValue(mockProvider);

  const provider = createDataProvider();
  const results = await provider.instrumentLookup('ZZZZ');

  expect(results).toMatchInlineSnapshot(`
    Array [
      Object {
        "data": null,
        "exchange": "NYSE",
        "externalId": "ABCD",
        "name": "ABCD INC",
        "symbol": "ABCD",
      },
      Object {
        "data": null,
        "exchange": "NYSE",
        "externalId": "ABCD2",
        "name": "ABCD v2 INC",
        "symbol": "ABCD v2",
      },
    ]
  `);
});
