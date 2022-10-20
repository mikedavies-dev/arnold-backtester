import {DataProvider, Instrument} from '../../core';
import {
  connect,
  disconnect,
  resetDatabase,
  instrumentLookup,
} from '../../utils/db';
import {ensureSymbolsAreAvailable} from '../../utils/data-storage';

import {lookupSymbol} from '../../utils/instrument-lookup';

jest.mock('../../utils/instrument-lookup');

const lookupSymbolMock = lookupSymbol as jest.MockedFunction<
  typeof lookupSymbol
>;

const instruments = [
  {
    symbol: 'ABCD',
    name: 'ABCD INC',
    data: {},
  },
  {
    symbol: 'MSFT',
    name: 'MICROSOFT INC',
    data: {},
  },
  {
    symbol: 'AAPL',
    name: 'APPLE INC',
    data: {},
  },
];

const dataProvider: DataProvider = {
  name: 'TEST',
  init: async () => {},
  shutdown: async () => {},
  getTimeSeries: async () => [],
  instrumentLookup: async () => [],
  downloadTickData: async () => {},
  subscribeMinuteBarUpdates: async () => {},
};

describe('mongo db tests', () => {
  beforeAll(async () => {
    // Reset the test database
    await resetDatabase();

    // Connect again
    await connect();

    lookupSymbolMock.mockImplementation(async ({symbol}) => {
      return instruments.find(
        i => i.symbol.indexOf(symbol) !== -1,
      ) as Instrument;
    });
  });

  afterAll(async () => {
    await disconnect();

    lookupSymbolMock.mockReset();
  });

  test('ensure empty list of symbols exists', async () => {
    await ensureSymbolsAreAvailable({
      dataProvider,
      symbols: [],
    });
  });

  test('save symbols to the db', async () => {
    const currentSymbols = await instrumentLookup({
      provider: 'TEST',
      symbols: ['MSFT'],
    });

    expect(currentSymbols.length).toBe(0);

    await ensureSymbolsAreAvailable({
      dataProvider,
      symbols: ['MSFT'],
    });

    const updatedSymbols = await instrumentLookup({
      provider: 'TEST',
      symbols: ['MSFT'],
    });

    expect(lookupSymbolMock).toBeCalledTimes(1);
    expect(updatedSymbols.length).toBe(1);

    // Calling again should find the stored symbols so we don't call lookupSymbol again
    await ensureSymbolsAreAvailable({
      dataProvider,
      symbols: ['MSFT'],
    });

    expect(lookupSymbolMock).toBeCalledTimes(1);
  });
});
