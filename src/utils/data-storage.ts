import series from 'promise-series2';
import {format} from 'date-fns';

import {LoggerCallback, TimeSeriesPeriod} from '../core';
import {hasTsForSymbolAndDate} from './tick-storage';
import {listAvailablePeriodsForSymbolAndDate} from './db';
import {createDataProvider} from './data-provider';

export async function ensureDataIsAvailable({
  symbols,
  dates,
  log,
}: {
  symbols: string[];
  dates: Date[];
  log: LoggerCallback;
}) {
  const requiredTsPeriods: TimeSeriesPeriod[] = ['m1', 'm5', 'm60', 'daily'];

  const dataProvider = createDataProvider();

  await series(
    async symbol => {
      log(`Ensuring data for ${symbol}`);
      await series(
        async date => {
          log(`Checking data for ${symbol}/${format(date, 'yyyy-MM-dd')}`);

          // Check for tick, m1, m5, m60, daily
          if (!(await hasTsForSymbolAndDate(symbol, date))) {
            log(`> Preloading tick data`);
          }

          // check for bar data
          const availablePeriods = await listAvailablePeriodsForSymbolAndDate(
            symbol,
            date,
          );

          const requiredPeriods = requiredTsPeriods.filter(
            requiredPeriod =>
              !availablePeriods.some(
                availablePeriod => availablePeriod === requiredPeriod,
              ),
          );

          await series(
            async period => {
              log(`> Preloading ${period}`);

              const series = await dataProvider.getTimeSeries(
                symbol,
                date,
                period,
              );

              // store the series in Mongo
              // await db.storeSeries(symbol, date, series);
            },
            null,
            requiredPeriods,
          );
        },
        null,
        dates,
      );
    },
    null,
    symbols,
  );
}
