/*
TODO:
1. Store data in Mongo
2. Store tick data in Mongo
3. Make call again to ensureBarDataIsAvailable and ensure that data is not loaded (because we already have it)

4. Load TS data from IB (IBNext?)
*/

import series from 'promise-series2';
import {subDays} from 'date-fns';

import {LoggerCallback, TimeSeriesPeriod, Instrument} from '../core';
import {lookupSymbol} from './instrument-lookup';
import {
  storeSeries,
  recordDataHasBeenRequested,
  instrumentLookup,
  storeInstrument,
  findFirstNonRequestedDateForPeriod,
  findLastNonRequestedDateForPeriod,
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
  const requiredBarPeriods: Array<TimeSeriesPeriod> = [
    'm1',
    // 'm5',
    // 'm60',
    // 'daily',
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

  /*
  TODO:
  - Store the loaded days in a single document for each instrument/period
  - Fix issue with date ranges (from, to)
  */

  await series(
    async instrument => {
      // log(`Ensuring data for ${instrument.symbol}`);
      await series(
        async period => {
          const periodFrom = await findFirstNonRequestedDateForPeriod(
            instrument,
            period,
            subDays(from, periodMinimumDays[period]),
            to,
          );

          const periodTo = await findLastNonRequestedDateForPeriod(
            instrument,
            period,
            subDays(from, periodMinimumDays[period]),
            to,
          );

          if (
            !periodFrom ||
            !periodTo ||
            periodFrom.getTime() === periodTo.getTime()
          ) {
            log(`No data required for ${instrument.symbol} ${period}`);
            return;
          }

          const blocks = splitDatesIntoBlocks(periodFrom, periodTo, period);

          if (!blocks.length) {
            log(
              `!!! No blocks for ${instrument.symbol} ${period}`,
              periodFrom,
              periodTo,
            );
          }

          await series(
            async ({end, days}) => {
              log(
                `Loading ${
                  instrument.symbol
                } / ${days} day(s) of ${period} until ${formatDate(end)}`,
              );

              // // // Load the data from the provider
              // const bars = await dataProvider.getTimeSeries(
              //   instrument,
              //   end,
              //   days,
              //   period,
              // );

              // // // Store the data in the database
              // await storeSeries(instrument.symbol, period, bars);

              // // Store that we have requested this date/period combo so we don't request it again
              // for (
              //   let day = subDays(end, days);
              //   isBefore(day, periodTo);
              //   day = addDays(day, 1)
              // ) {
              //   await recordDataHasBeenRequested(
              //     instrument.symbol,
              //     period,
              //     day,
              //   );
              // }
            },
            0,
            blocks,
          );
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
