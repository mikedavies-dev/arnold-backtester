/*
TODO:
1. Store data in Mongo
2. Store tick data in Mongo
3. Make call again to ensureDataIsAvailable and ensure that data is not loaded (because we already have it)

4. Load TS data from IB (IBNext?)
*/

import series from 'promise-series2';
import {parse, isBefore} from 'date-fns';

import {LoggerCallback, TimeSeriesPeriod, Instrument} from '../core';
// import {hasTsForSymbolAndDate} from './tick-storage';
import {lookupSymbol} from './instrument-lookup';
import {
  getDataAvailableTo,
  storeSeries,
  updateDataAvailableTo,
  instrumentLookup,
  storeInstrument,
} from './db';
import {DataProvider} from '../core';
import Env from './env';
import {splitDatesIntoBlocks} from './timeseries';

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

  const instruments = await instrumentLookup({
    provider: dataProvider.name,
    symbols,
  });

  await series(
    async instrument => {
      log(`Ensuring data for ${instrument.symbol}`);
      await series(
        async period => {
          log(`> Preloading ${period}`);

          const dataAvailableTo = await getDataAvailableTo(
            instrument.symbol,
            period,
          );
          const startDate = dataAvailableTo || earliestDataDate;

          // If the latest data we have is before the latest load data then load more
          if (isBefore(startDate, until)) {
            const blocks = splitDatesIntoBlocks(startDate, until, period);

            await series(
              async ({end, days}) => {
                log(
                  `> Loading ${period}, ${days} days until ${end} for ${instrument.symbol}`,
                );

                // Load the data from the provider
                const bars = await dataProvider.getTimeSeriesBlock(
                  instrument,
                  end,
                  days,
                  period,
                );

                // Store the data in the database
                await storeSeries(instrument.symbol, period, bars);

                // Update the new latest date so we don't load it again
                await updateDataAvailableTo(instrument.symbol, period, until);
              },
              0,
              blocks,
            );
          }
        },
        null,
        requiredBarPeriods,
      );
    },
    null,
    instruments,
  );
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
