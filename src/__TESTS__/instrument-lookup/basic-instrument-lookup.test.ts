jest.mock('inquirer');

import inquirer from 'inquirer';

import {DataProvider} from '../../core';
import {lookupSymbol} from '../../utils/instrument-lookup';

const promptMock = inquirer.prompt as jest.MockedFunction<
  typeof inquirer.prompt
>;

afterEach(() => {
  promptMock.mockReset();
});

function getAnswers(answers: Record<string, any>): any {
  return Promise.resolve(answers);
}

const instruments = [
  {
    externalId: 'ABCD',
    symbol: 'ABCD',
    name: 'ABCD INC',
    data: {},
  },
  {
    externalId: 'MSFT',
    symbol: 'MSFT',
    name: 'MICROSOFT INC',
    data: {},
  },
  {
    externalId: 'AAPL',
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
  downloadTickData: async () => {},
  subscribePriceUpdates: () => {
    return 0;
  },
  cancelPriceUpdates: () => {},
  instrumentLookup: async searchTerm => {
    return instruments.filter(
      i =>
        i.symbol.indexOf(searchTerm) !== -1 ||
        i.name.indexOf(searchTerm) !== -1,
    );
  },
};

test('test symbol lookup', async () => {
  promptMock
    .mockReturnValueOnce(
      getAnswers({
        searchTerm: 'ABCD',
      }),
    )
    .mockReturnValueOnce(
      getAnswers({
        result: 'ABCD',
      }),
    );

  const results = await lookupSymbol({
    dataProvider,
    symbol: 'ABCD',
  });

  expect(results).toMatchInlineSnapshot(`
    Object {
      "data": Object {},
      "externalId": "ABCD",
      "name": "ABCD INC",
      "symbol": "ABCD",
    }
  `);
});

test('enter a new search term', async () => {
  promptMock
    // first search term
    .mockReturnValueOnce(
      getAnswers({
        searchTerm: 'ABCD',
      }),
    )
    // search again
    .mockReturnValueOnce(
      getAnswers({
        result: null,
      }),
    )
    // second search term
    .mockReturnValueOnce(
      getAnswers({
        searchTerm: 'MSFT',
      }),
    )
    // check result
    .mockReturnValueOnce(
      getAnswers({
        result: 'MSFT',
      }),
    );

  const results = await lookupSymbol({
    dataProvider,
    symbol: 'ABCD',
  });

  // Second search chose MSFT
  expect(results).toMatchInlineSnapshot(`
    Object {
      "data": Object {},
      "externalId": "MSFT",
      "name": "MICROSOFT INC",
      "symbol": "MSFT",
    }
  `);
});
