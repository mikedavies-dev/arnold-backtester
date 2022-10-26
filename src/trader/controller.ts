import series from 'promise-series2';
import {
  addHours,
  fromUnixTime,
  getUnixTime,
  isAfter,
  parse,
  startOfDay,
} from 'date-fns';

import {LoggerCallback, MaximumBarCount, Tracker, BrokerState} from '../core';
import {createDataProvider} from '../utils/data-provider';
import {getLiveConfig} from '../utils/live-config';
import Env from '../utils/env';

import {
  ensureBarDataIsAvailable,
  ensureSymbolsAreAvailable,
} from '../utils/data-storage';

import {loadTrackerBars, instrumentLookup} from '../utils/db';
import {
  initTracker,
  handleTrackerMinuteBar,
  handleTrackerTick,
} from '../utils/tracker';
import {getMarketOpen, getMarketClose} from '../utils/market';
import {loadStrategy} from '../utils/module';
import {formatDateTime} from '../utils/dates';

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

function initBrokerState({balance}: {balance: number}) {
  return {
    getMarketTime: () => new Date(),
    nextOrderId: 1,
    orders: [],
    openOrders: {},
    positions: [],
    openPositions: {},
    orderExecutionDelayMs: 0,
    balance,
    commissionPerOrder: 0,
  };
}

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
  log(`Loaded ${liveConfig.profiles.length} live profiles`);

  const today = startOfDay(new Date());

  const marketOpen = getMarketOpen(today);
  const marketClose = getMarketClose(today);

  try {
    // Make sure we have data for all these symbols
    const activeProfiles = await series(
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

        const strategy = await loadStrategy(
          Env.getUserPath(`./live-strategies/${profile.strategy.name}.ts`),
        );

        if (!strategy) {
          throw new Error('strategy-not-found');
        }

        log(`> Loaded ${profile.name}`);

        return {
          name: profile.name,
          strategy,
          symbols: profile.symbols,
          symbolLookup: new Set(profile.symbols),
          // TODO, this should load state from the DB if needed?
          brokerState: initBrokerState({balance: profile.accountSize}),
        };
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
    const instruments = (
      await instrumentLookup({
        provider: dataProvider.name,
        symbols,
      })
    ).map(instrument => {
      return {
        instrument,
        symbol: instrument.symbol,
        profiles: activeProfiles.filter(p =>
          p.symbolLookup.has(instrument.symbol),
        ),
      };
    });

    // Load all minute data until now
    await Promise.all(
      instruments.map(async ({instrument, symbol}) => {
        const bars = (
          await dataProvider.getTimeSeries(instrument, new Date(), 1, 'm1')
        ).filter(bar => parse(bar.time, 'yyyy-MM-dd HH:mm:ss', new Date()));

        // Iterate bars and apply them to the trackers
        bars.forEach(bar => {
          handleTrackerMinuteBar({
            data: trackers[symbol],
            bar,
            marketOpen,
            marketClose,
            marketTime: getUnixTime(
              parse(bar.time, 'yyyy-MM-dd HH:mm:ss', new Date()),
            ),
          });
        });

        await dataProvider.subscribeMarketUpdates({
          instrument,
          onUpdate: ({type, value}) => {
            handleTrackerTick({
              data: trackers[symbol],
              tick: {
                type,
                size: 0, // We don't worry about size updates because we don't store BID_SIZE or ASK_SIZE
                value: value,
                time: getUnixTime(new Date()),
              },
              marketOpen,
              marketClose,
            });

            // TODO, handle broker tick or is that handled totally by IB?
          },
        });
      }),
    );

    const shutdownAt = addHours(fromUnixTime(marketClose), 1);

    // Wait until the market closes
    log(`Worker will shut down at ${formatDateTime(shutdownAt)}`);

    while (!isAfter(new Date(), shutdownAt)) {
      /*
      The question is: Do we need time and sales data when a stock is in a setup or can
      we just rely on watch list data for trading/entering?

      We'll start with just using the watch data and then move to time and sales later
      if we need it. That means that backtesting has a lot higher resolution data than
      live trading in terms of tick and bid/ask updates but hopefully that won't cause issues

      If we need time and sales data we can add it fairly easily later
      */
      await sleep(1000);
    }
  } catch (err) {
    log('Failed', err);
  }

  // Disconnect
  log('Disconnecting from data provider');
  await dataProvider.shutdown();
}
