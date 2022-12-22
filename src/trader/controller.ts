import series from 'promise-series2';
import {
  addHours,
  fromUnixTime,
  getMinutes,
  getUnixTime,
  isAfter,
  parse,
  startOfDay,
  format,
} from 'date-fns';

import {
  LoggerCallback,
  MaximumBarCount,
  Tracker,
  OrderSpecification,
  Tick,
  DataProvider,
  LiveTradingConfig,
  BrokerProvider,
} from '../core';
import {create as createPositions} from '../utils/positions';

import {createDataProvider, createBroker} from '../utils/data-provider';
import {getLiveConfig} from '../utils/live-config';
import Env from '../utils/env';
import {getTimes} from '../utils/dates';

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

import {
  getMarketOpen,
  getMarketClose,
  getPreMarketOpen,
  getMarketState,
} from '../utils/market';

import {loadStrategy} from '../utils/module';
import {formatDateTime} from '../utils/dates';

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

async function initProfiles(
  dataProvider: DataProvider,
  broker: BrokerProvider,
  log: LoggerCallback,
  today: Date,
  liveConfig: LiveTradingConfig,
) {
  return await series(
    async ({
      id,
      name,
      symbols,
      extraSymbols,
      strategy: strategyDef,
      accountSize,
    }) => {
      const symbolsThatRequireData = Array.from(
        new Set([...symbols, ...extraSymbols]),
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
        Env.getUserPath(`./live-strategies/${strategyDef.name}.ts`),
      );

      if (!strategy) {
        throw new Error('strategy-not-found');
      }

      log(`> Loaded ${name}`);

      return {
        id,
        name: name,
        symbols,
        strategy,
      };
    },
    false,
    liveConfig.profiles,
  );
}

export async function runLiveController({log}: {log: LoggerCallback}) {
  // connect to the data provider
  log('Connecting to data provider');
  const dataProvider = await createDataProvider({log});
  await dataProvider.init();

  // connect to the data provider
  log('Connecting to broker');

  const positions = createPositions();
  await positions.init();

  const broker = await createBroker({log, positions});
  await broker.init();

  // Load the live config
  const liveConfig = await getLiveConfig();
  log(`Loaded ${liveConfig.profiles.length} live profiles`);

  const today = startOfDay(new Date());

  const marketOpen = getMarketOpen(today);
  const marketClose = getMarketClose(today);
  const preMarketOpen = getPreMarketOpen(today);

  try {
    // Make sure we have data for all these symbols
    const activeProfiles = await initProfiles(
      dataProvider,
      broker,
      log,
      today,
      liveConfig,
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
        profiles: activeProfiles
          .filter(p => p.symbols.find(s => s === instrument.symbol))
          .map(p => ({
            ...p,
            currentlyInSetup: false,
          })),
      };
    });

    // Load all minute data until now
    await Promise.all(
      instruments.map(async ({instrument, symbol, profiles}) => {
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
            const marketTime = getUnixTime(new Date());

            const marketState = getMarketState(
              marketTime,
              preMarketOpen,
              marketOpen,
              marketClose,
            );

            const tick: Tick = {
              type,
              size: 0, // TODO, We don't worry about size updates because we don't store BID_SIZE or ASK_SIZE
              value: value,
              time: marketTime,
            };

            // Update the tracker
            handleTrackerTick({
              data: trackers[symbol],
              tick,
              marketOpen,
              marketClose,
            });

            profiles
              .filter(p => p.currentlyInSetup)
              .forEach(({id: profileId, strategy}) => {
                strategy.handleTick({
                  log,
                  marketState,
                  marketTime: getTimes(marketTime),
                  tick,
                  symbol,
                  tracker: trackers[symbol],
                  trackers,
                  broker: {
                    orders: positions.getOrders(profileId),
                    positions: positions.getPositions(profileId),
                    placeOrder: (symbol: string, order: OrderSpecification) => {
                      const match = instruments.find(i => i.symbol === symbol);

                      if (!match) {
                        return -1;
                      }

                      return broker.placeOrder({
                        profileId,
                        instrument: match.instrument,
                        order,
                      });
                    },
                    hasOpenOrders: (symbol: string) => {
                      const match = instruments.find(i => i.symbol === symbol);

                      if (!match) {
                        return false;
                      }

                      return broker.hasOpenOrders(profileId, match.instrument);
                    },
                    getPositionSize: (symbol: string) => {
                      const match = instruments.find(i => i.symbol === symbol);

                      if (!match) {
                        return 0;
                      }

                      return broker.getPositionSize(
                        profileId,
                        match.instrument,
                      );
                    },
                    closePosition: (symbol: string, reason: string | null) => {
                      const match = instruments.find(i => i.symbol === symbol);

                      if (!match) {
                        return -1;
                      }

                      return broker.closePosition(
                        profileId,
                        match.instrument,
                        reason,
                      );
                    },
                    hasOpenPosition: symbol => {
                      const match = instruments.find(i => i.symbol === symbol);

                      if (!match) {
                        return false;
                      }

                      return broker.hasOpenPosition(
                        profileId,
                        match.instrument,
                      );
                    },
                  },
                });
              });
          },
        });
      }),
    );

    const shutdownAt = addHours(fromUnixTime(marketClose), 1);

    // Wait until the market closes
    log(`Worker will shut down at ${formatDateTime(shutdownAt)}`);

    let currentMinute = -1;

    while (!isAfter(new Date(), shutdownAt)) {
      /*
      The question is: Do we need time and sales data when a stock is in a setup or can
      we just rely on watch list data for trading/entering?

      We'll start with just using the watch data and then move to time and sales later
      if we need it. That means that backtesting has a lot higher resolution data than
      live trading in terms of tick and bid/ask updates but hopefully that won't cause issues

      If we need time and sales data we can add it fairly easily later by requesting it when
      any profile for a symbol is in a setup and stopping when not and no open orders
      */

      const nextMinute = getMinutes(new Date());

      if (nextMinute !== currentMinute) {
        const marketTime = getUnixTime(new Date());

        const marketState = getMarketState(
          marketTime,
          preMarketOpen,
          marketOpen,
          marketClose,
        );

        instruments.forEach(({symbol, profiles}) => {
          profiles.forEach(profile => {
            const inSetup = profile.strategy.isSetup({
              symbol,
              tracker: trackers[symbol],
              trackers,
              log,
              marketTime: getTimes(marketTime),
              marketOpen: getTimes(marketOpen),
              marketClose: getTimes(marketClose),
              marketState,
            });

            // Update the UI
            if (profile.currentlyInSetup !== inSetup) {
              log(
                inSetup
                  ? `${profile.name} for ${symbol} is in a setup`
                  : `${profile.name} for ${symbol} no longer in a setup`,
              );
            }

            profile.currentlyInSetup = inSetup;
          });
        });

        currentMinute = nextMinute;
      }

      // TODO, update the main UI process via IPC

      // store the current positions in the database
      await positions.writeDbUpdates();

      await sleep(1000);
    }
  } catch (err) {
    log('Failed', err);
  }

  // Disconnect
  log('Shutting down positions');
  await positions.shutdown();

  log('Disconnecting from data provider');
  await dataProvider.shutdown();

  log('Disconnecting from broker');
  await broker.shutdown();
}
