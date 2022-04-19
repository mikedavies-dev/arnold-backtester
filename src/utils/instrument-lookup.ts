import inquirer from 'inquirer';

import {DataProvider, Instrument} from '../core';

export async function lookupSymbol({
  dataProvider,
  symbol,
}: {
  dataProvider: DataProvider;
  symbol: string;
}): Promise<Instrument> {
  // eslint-disable-next-line
  while (true) {
    const {searchTerm} = await inquirer.prompt([
      {
        type: 'input',
        name: 'searchTerm',
        message: `Enter a search term for ${symbol}`,
        default: symbol,
      },
    ]);

    // get the results
    const suggestions = await dataProvider.instrumentLookup(searchTerm);

    const {result} = await inquirer.prompt([
      {
        type: 'list',
        name: 'result',
        message: `Results for ${symbol}`,
        choices: [
          ...suggestions.map(r => ({
            name: `${r.name}`,
            value: r.symbol,
          })),
          new inquirer.Separator(),
          {
            value: null,
            name: 'Enter a new search term',
          },
        ],
      },
    ]);

    if (result !== null) {
      return suggestions.find(s => s.symbol === result) as Instrument;
    }
  }
}
