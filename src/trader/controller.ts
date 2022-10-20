import series from 'promise-series2';
import {getUnixTime, parse, startOfDay} from 'date-fns';

import {LoggerCallback, MaximumBarCount, Tracker} from '../core';
import {createDataProvider} from '../utils/data-provider';
import {getLiveConfig} from '../utils/live-config';

import {
  ensureBarDataIsAvailable,
  ensureSymbolsAreAvailable,
} from '../utils/data-storage';

import {loadTrackerBars, instrumentLookup} from '../utils/db';
import {initTracker, handleTrackerMinuteBar} from '../utils/tracker';
import {getMarketOpen, getMarketClose} from '../utils/market';

/*
* Connect to data provider
- Connect to broker provider
* Load live config
* Ensure we have historic data available (ok)
* Load tracker data with data until today (ok)
* Request minute data from provider including live updates
* Run today's bar data through all trackers
- For each new bar (or update?) run isSetup on each strategy
- If inSetup start requesting tick/time and sales updates
- Handle each tick until isSetup=False and no open trades
*/

export async function runLiveController({log}: {log: LoggerCallback}) {
  // connect to the data provider
  log('Connecting to data provider');
  const dataProvider = await createDataProvider({log});
  await dataProvider.init();

  // Load the live config
  const liveConfig = await getLiveConfig();
  log(`Loaded ${liveConfig.profiles.length} live profiles:`);

  const today = startOfDay(new Date());

  const marketOpen = getMarketOpen(today);
  const marketClose = getMarketClose(today);

  // Make sure we have data for all these symbols
  await series(
    async profile => {
      const symbolsThatRequireData = Array.from(
        new Set([...profile.symbols, ...profile.extraSymbols]),
      );

      // Make sure we have symbols in our db
      await ensureSymbolsAreAvailable({
        dataProvider,
        symbols: symbolsThatRequireData,
      });

      // make sure we have data available
      await ensureBarDataIsAvailable({
        dataProvider,
        symbols: symbolsThatRequireData,
        log,
        from: today,
        to: today,
      });
    },
    false,
    liveConfig.profiles,
  );

  const symbols = Array.from(
    new Set(
      liveConfig.profiles
        .map(profile => [...profile.symbols, ...profile.extraSymbols])
        .flat(),
    ),
  );

  // Load trackers for all symbols using data from the db
  const trackers = symbols.reduce(
    (acc, symbol) => ({
      ...acc,
      [symbol]: initTracker(),
    }),
    {} as Record<string, Tracker>,
  );

  // Pre-load data into the trackers
  await Promise.all(
    symbols.map(async symbol => {
      trackers[symbol].bars = await loadTrackerBars(
        symbol,
        today,
        MaximumBarCount,
      );
    }),
  );

  // Request all minute data until today

  const instruments = await instrumentLookup({
    provider: dataProvider.name,
    symbols,
  });

  // Load all minute data until now
  await Promise.all(
    instruments.map(async instrument => {
      const bars = (
        await dataProvider.getTimeSeries(instrument, new Date(), 1, 'm1')
      ).filter(bar => parse(bar.time, 'yyyy-MM-dd HH:mm:ss', new Date()));

      // Iterate bars and apply them to the trackers
      bars.forEach(bar => {
        handleTrackerMinuteBar({
          data: trackers[instrument.symbol],
          bar,
          marketOpen,
          marketClose,
          marketTime: getUnixTime(
            parse(bar.time, 'yyyy-MM-dd HH:mm:ss', new Date()),
          ),
        });
      });

      await dataProvider.subscribeMinuteBarUpdates({
        instrument,
        onUpdate: bar => {
          if (bar.volume < 0) {
            // new bar, ignore
            return;
          }

          handleTrackerMinuteBar({
            data: trackers[instrument.symbol],
            bar,
            marketOpen,
            marketClose,
            marketTime: getUnixTime(
              parse(bar.time, 'yyyy-MM-dd HH:mm:ss', new Date()),
            ),
          });
        },
      });
    }),
  );

  // Disconnect
  log('Disconnecting from data provider');

  // await dataProvider.shutdown();
}
