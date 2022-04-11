/*
TODO:
1. Store data in Mongo
2. Store tick data in Mongo
3. Make call again to ensureDataIsAvailable and ensure that data is not loaded (because we already have it)

4. Load TS data from IB (IBNext?)
*/

import series from 'promise-series2';
import {parse, isBefore} from 'date-fns';
import inquirer from 'inquirer';

import {LoggerCallback, TimeSeriesPeriod} from '../core';
// import {hasTsForSymbolAndDate} from './tick-storage';
import {
  getDataAvailableTo,
  storeSeries,
  updateDataAvailableTo,
  instrumentLookup,
  storeInstrument,
} from './db';
import {DataProvider, Instrument} from '../core';
import Env from './env';

export async function ensureDataIsAvailable({
  symbols,
  log,
  until,
  dataProvider,
}: {
  symbols: string[];
  log: LoggerCallback;
  until: Date;
  dataProvider: DataProvider;
}) {
  const requiredBarPeriods: Array<TimeSeriesPeriod> = [
    'm1',
    'm5',
    'm60',
    'daily',
  ];

  const earliestDataDate = parse(Env.EARLIEST_DATA, 'yyyy-MM-dd', new Date());

  await series(
    async symbol => {
      log(`Ensuring data for ${symbol}`);
      await series(
        async period => {
          log(`> Preloading ${period}`);

          const dataAvailableTo = await getDataAvailableTo(symbol, period);
          const startDate = dataAvailableTo || earliestDataDate;

          // If the latest data we have is before the latest load data then load more
          if (isBefore(startDate, until)) {
            // Load the data from the provider
            const series = await dataProvider.getTimeSeries(
              symbol,
              startDate,
              until,
              period,
            );

            // Store the data in the database
            await storeSeries(symbol, period, series);

            // Update the new latest date so we don't load it again
            await updateDataAvailableTo(symbol, period, until);
          }
        },
        null,
        requiredBarPeriods,
      );
    },
    null,
    symbols,
  );
}

async function listSuggestions(symbol: string) {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    {
      value: symbol,
      name: `Company ${symbol}`,
    },
  ];
}

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
