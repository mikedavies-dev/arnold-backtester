import series from 'promise-series2';
import inquirer from 'inquirer';

import {instrumentLookup, storeInstrument} from './db';
import {DataProvider, Instrument} from '../core';

async function lookupSymbol({
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
            name: r.name,
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
      const instrument = suggestions.find(s => s.symbol === result);
      if (!instrument) {
        throw new Error('instrument not found');
      }
      return instrument;
    }
  }
}

export async function ensureSymbolsAreAvailable({
  dataProvider,
  symbols,
}: {
  dataProvider: DataProvider;
  symbols: string[];
}) {
  // Find any instruments that we don't have in the DB
  const existingInstruments = await instrumentLookup({
    provider: dataProvider.name,
    symbols,
  });

  // find the symbols we need
  const requiredSymbols = symbols.filter(
    s => !existingInstruments.find(instrument => instrument.symbol === s),
  );

  const instruments = await series<string, Instrument>(
    symbol =>
      lookupSymbol({
        symbol,
        dataProvider,
      }),
    false,
    requiredSymbols,
  );

  // Store the instruments in the database
  await Promise.all(
    instruments.map(instrument => {
      return storeInstrument({
        provider: dataProvider.name,
        instrument,
      });
    }),
  );
}
