import series from 'promise-series2';
import {
  addHours,
  fromUnixTime,
  getUnixTime,
  isAfter,
  parse,
  startOfDay,
} from 'date-fns';

import {
  LoggerCallback,
  MaximumBarCount,
  Tracker,
  OrderSpecification,
  Tick,
  DataProvider,
  LiveTradingConfig,
  TraderStatusUpdate,
} from '../core';

import {indicatorUpdateWrapper} from '../utils/indicators';

import {create as createPositions} from '../utils/positions';

import {createDataProvider, createBroker} from '../utils/data-provider';
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

import {
  getMarketOpen,
  getMarketClose,
  getPreMarketOpen,
  initMarket,
  updateMarket,
} from '../utils/market';

import {loadStrategy} from '../utils/module';
import {formatDateTime} from '../utils/dates';

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

async function initProfiles(
  dataProvider: DataProvider,
  log: LoggerCallback,
  today: Date,
  liveConfig: LiveTradingConfig,
) {
  return await series(
    async ({
      id,
      name,
      symbols,
      strategy: strategyDef,
      // accountSize,
    }) => {
      const strategy = await loadStrategy(
        Env.getUserPath(`./live-strategies/${strategyDef.name}.ts`),
      );

      if (!strategy) {
        throw new Error('strategy-not-found');
      }

      const symbolsThatRequireData = Array.from(
        new Set([...symbols, ...strategy.extraSymbols]),
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

      log(`Loaded ${name}`);

      return {
        id,
        name: name,
        symbols,
        factory: strategy.factory,
        extraSymbols: strategy.extraSymbols,
      };
    },
    false,
    liveConfig.profiles,
  );
}

type LiveTradeController = {
  quit: () => void;
  closeAll: () => void;
  close: (symbol: string) => void;
  selectSymbol: (symbol: string) => void;
};

export async function runLiveController({
  log,
  update,
  ready,
}: {
  log: LoggerCallback;
  update: (data: TraderStatusUpdate) => void;
  ready: (controller: LiveTradeController) => void;
}) {
  // connect to the data provider
  log('Connecting to data provider');
  const dataProvider = createDataProvider({log, type: 'trader'});
  await dataProvider.init();

  // connect to the data provider
  log('Connecting to broker');

  const positions = createPositions({
    log,
  });
  await positions.init();

  const broker = createBroker({log, positions});
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
      log,
      today,
      liveConfig,
    );

    const symbols = Array.from(
      new Set(
        activeProfiles
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
    const market = initMarket(
      new Date(),
      preMarketOpen,
      marketOpen,
      marketClose,
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
          .map(p => {
            const profileId = p.id;

            const strategy = p.factory({
              symbol: instrument.symbol,
              log,
              market,
              trackers,
              tracker: trackers[instrument.symbol],
              broker: {
                orders: positions.getOrders(profileId),
                positions: positions.getPositions(profileId),
                placeOrder: (order: OrderSpecification) =>
                  broker.placeOrder({
                    profileId,
                    instrument: instrument,
                    order,
                  }),
                hasOpenOrders: () =>
                  broker.hasOpenOrders(profileId, instrument),
                getPositionSize: () =>
                  broker.getPositionSize(profileId, instrument),
                closePosition: (reason: string | null) =>
                  broker.closePosition(profileId, instrument, reason),
                hasOpenPosition: () =>
                  broker.hasOpenPosition(profileId, instrument),
                getOpenPosition: () =>
                  broker.getOpenPosition(profileId, instrument),
              },
            });

            return {
              ...p,
              currentlyInSetup: false,
              id: p.id,
              name: p.name,
              strategy,
              indicators: strategy.indicators.map(indicatorUpdateWrapper),
            };
          }),
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

        dataProvider.subscribeMarketUpdates({
          instrument,
          onUpdate: ({type, value}) => {
            // set the current market time
            updateMarket(market, new Date());

            const tick: Tick = {
              type,
              size: 0, // TODO, We don't worry about size updates because we don't store BID_SIZE or ASK_SIZE
              value: value,
              time: market.current.unix,
            };

            // Update the tracker
            handleTrackerTick({
              data: trackers[symbol],
              tick,
              marketOpen,
              marketClose,
            });

            profiles.forEach(profile => {
              // update the indicators
              profile.indicators.forEach(indicator => indicator.update());

              const inSetup = profile.strategy.isSetup({});

              // Update the UI
              if (profile.currentlyInSetup !== inSetup) {
                log(
                  inSetup
                    ? `${symbol} is in a ${profile.name} setup`
                    : `${symbol} is no longer in a ${profile.name} setup`,
                );
              }

              profile.currentlyInSetup = inSetup;

              /*
              The question is: Do we need time and sales data when a stock is in a setup or can
              we just rely on watch list data for trading/entering?

              We'll start with just using the watch data and then move to time and sales later
              if we need it. That means that backtesting has a lot higher resolution data than
              live trading in terms of tick and bid/ask updates but hopefully that won't cause issues

              If we need time and sales data we can add it fairly easily later by requesting it when
              any profile for a symbol is in a setup and stopping when not and no open orders
              */

              if (inSetup) {
                profile.strategy.handleTick(tick);
              }
            });
          },
        });
      }),
    );

    const shutdownAt = addHours(fromUnixTime(marketClose), 1);

    // Wait until the market closes
    log(`Worker will shut down at ${formatDateTime(shutdownAt)}`);

    let shouldExit = false;

    // tell the caller that we are ready
    ready({
      quit: () => {
        shouldExit = true;
      },
      closeAll: () => {
        const openPositions = positions.getAllOpenPositions();

        if (!openPositions.length) {
          log(`No open positions found`);
          return;
        }

        openPositions.forEach(p => {
          const instrument = instruments.find(i => i.symbol === p.symbol);

          if (instrument) {
            log(`Closing position ${p.externalId} for ${instrument.symbol}`);

            broker.closePosition(
              p.profileId,
              instrument.instrument,
              'manually closed',
            );
          }
        });
      },
      close: (symbol: string) => {
        const instrument = instruments.find(i => i.symbol === symbol);
        if (!instrument) {
          log(`No instrument found for ${symbol}`);
          return;
        }

        const openPositions = positions
          .getAllOpenPositions()
          .filter(p => p.symbol === symbol);

        if (!openPositions) {
          log(`No open positions found for ${symbol}`);
          return;
        }

        openPositions.forEach(p => {
          log(`Closing position ${p.externalId} for ${symbol}`);
          broker.closePosition(
            p.profileId,
            instrument.instrument,
            'manually closed',
          );
        });
      },
      selectSymbol: symbol => {
        const instrument = instruments.find(i => i.symbol === symbol);
        if (!instrument) {
          log(`No instrument found for ${symbol}`);
          return;
        }
        dataProvider.select(instrument.instrument);
      },
    });

    // perform an inicial update/calculation of the indicators
    instruments.forEach(({profiles}) => {
      profiles.forEach(({indicators}) => {
        indicators.forEach(indicator => indicator.update());
      });
    });

    while (!isAfter(new Date(), shutdownAt) && !shouldExit) {
      // update any ui interfaces
      update({
        market,
        positions: positions.getAllPositions(),
        instruments: instruments.map(({symbol, profiles}) => ({
          symbol,
          tracker: trackers[symbol],
          profiles: profiles.map(profile => ({
            id: profile.id,
            name: profile.name,
            currentlyInSetup: profile.currentlyInSetup,
          })),
        })),
      });

      // store the current positions in the database
      await positions.writeDbUpdates();

      await sleep(1000);
    }
  } catch (err) {
    log('Failed ${err}', err);
  }

  // Disconnect
  log('Shutting down positions');
  await positions.shutdown();

  log('Disconnecting from data provider');
  await dataProvider.shutdown();

  log('Disconnecting from broker');
  await broker.shutdown();
}
