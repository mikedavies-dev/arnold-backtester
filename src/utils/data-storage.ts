/*
TODO:
1. Store data in Mongo
2. Store tick data in Mongo
3. Make call again to ensureDataIsAvailable and ensure that data is not loaded (because we already have it)

4. Load TS data from IB (IBNext?)
*/

import series from 'promise-series2';
import {parse, isBefore} from 'date-fns';

import {LoggerCallback, TimeSeriesPeriod} from '../core';
// import {hasTsForSymbolAndDate} from './tick-storage';
import {getDataAvailableTo, storeSeries, updateDataAvailableTo} from './db';
import {DataProvider} from '../core';
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
