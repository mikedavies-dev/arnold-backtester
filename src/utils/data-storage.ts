import series from 'promise-series2';
import {addDays, isBefore, isSameDay, startOfDay, subDays} from 'date-fns';

import {LoggerCallback, TimeSeriesPeriod, Instrument} from '../core';
import {lookupSymbol} from './instrument-lookup';
import {
  storeSeries,
  recordDataHasBeenRequested,
  instrumentLookup,
  storeInstrument,
  findNonRequestedRangeForPeriod,
} from './db';
import {DataProvider} from '../core';
import {splitDatesIntoBlocks} from './timeseries';
import {formatDate} from './dates';

export async function ensureBarDataIsAvailable({
  symbols,
  log,
  from,
  to,
  dataProvider,
}: {
  symbols: string[];
  log: LoggerCallback;
  from: Date;
  to: Date;
  dataProvider: DataProvider;
}) {
  // console.trace('ensureBarDataIsAvailable');

  const requiredBarPeriods: Array<TimeSeriesPeriod> = [
    'm1',
    'm5',
    'm60',
    'daily',
  ];

  const instruments = await instrumentLookup({
    provider: dataProvider.name,
    symbols,
  });

  const periodMinimumDays: Record<TimeSeriesPeriod, number> = {
    m1: 1,
    m5: 5,
    m60: 60,
    daily: 200,
  };

  await series(
    async instrument => {
      await series(
        async period => {
          const range = await findNonRequestedRangeForPeriod(
            instrument.symbol,
            period,
            subDays(from, periodMinimumDays[period]),
            to,
          );

          if (!range) {
            return;
          }

          const blocks = splitDatesIntoBlocks(
            range.from,
            addDays(range.to, 1), // Request data until day+1 to include data for day
            period,
          );

          await series(
            async ({end, days}) => {
              log(
                `Loading ${
                  instrument.symbol
                } / ${days} day(s) of ${period} until end of ${formatDate(
                  subDays(end, 1),
                )}`,
              );

              // // Load the data from the provider
              const bars = await dataProvider.getTimeSeries(
                instrument,
                end,
                days,
                period,
              );

              // Store the data in the database
              await storeSeries(instrument.symbol, period, bars);

              // Store that we have requested this date/period combo so we don't request it again
              for (
                let day = subDays(end, days);
                isBefore(day, range.to) || isSameDay(day, range.to);
                day = addDays(day, 1)
              ) {
                // only record the
                if (isBefore(day, startOfDay(new Date()))) {
                  await recordDataHasBeenRequested(
                    instrument.symbol,
                    period,
                    day,
                  );
                }
              }
            },
            1,
            blocks,
          );
        },
        3,
        requiredBarPeriods,
      );
    },
    10,
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
