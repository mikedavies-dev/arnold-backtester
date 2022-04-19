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
    getTimeSeries: jest.fn(async () => {
      return [];
    }),
    getTimeSeriesBlock: async () => [],
    instrumentLookup: async () => [
      {
        symbol: 'ABCD',
        name: 'ABCD INC',
        exchange: 'NYSE',
        data: null,
      },
      {
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
        "name": "ABCD INC",
        "symbol": "ABCD",
      },
      Object {
        "data": null,
        "exchange": "NYSE",
        "name": "ABCD v2 INC",
        "symbol": "ABCD v2",
      },
    ]
  `);
});
