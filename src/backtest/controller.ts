import {format} from 'date-fns';
import {StaticPool} from 'node-worker-threads-pool';
import numeral from 'numeral';
import path from 'path';
import series from 'promise-series2';

import Env from '../utils/env';
import {LogMessage, LoggerCallback, Position, Profile} from '../core';
import {profileExists, loadBacktestProfile} from '../utils/profile';
import {BackTestWorkerErrorCode} from '../backtest/worker';
import {
  ensureBarDataIsAvailable,
  ensureSymbolsAreAvailable,
} from '../utils/data-storage';
import {createDataProvider} from '../utils/data-provider';
import {loadStrategy} from '../utils/module';
import {ensureTickDataIsAvailable} from '../utils/tick-storage';
import {dateArray} from '../utils/dates';

const baseFolder = path.parse(__filename).dir;
const filePath = path.join(baseFolder, '../bin/worker.js');

export type WorkerResult = {
  error?: BackTestWorkerErrorCode;
  positions?: Array<Position>;
  logs: Array<LogMessage>;
};

export type BackTestControllerErrorCode =
  | 'invalid-profile'
  | 'no-symbol-data'
  | 'invalid-symbol-data'
  | 'unknown';

export type BacktestResults = {
  positions: Array<Position>;
  profile: Profile;
  createdAt: Date;
  logs: Array<LogMessage>;
};

export class BacktestControllerError extends Error {
  constructor(public code: BackTestControllerErrorCode) {
    super(code);
    Object.setPrototypeOf(this, BacktestControllerError.prototype);
  }
}

export async function runBacktestController({
  log,
  profile,
  symbol,
  date,
}: {
  log: LoggerCallback;
  profile: string;
  symbol: string | null;
  date: Date | null;
}): Promise<BacktestResults> {
  log(`Loading profile '${profile}'`);

  if (!(await profileExists(profile))) {
    throw new BacktestControllerError('invalid-profile');
  }

  const runProfile = await loadBacktestProfile(profile);

  const symbols = symbol ? [symbol] : runProfile.symbols;
  const from = date ? date : runProfile.dates.from;
  const to = date ? date : runProfile.dates.to;

  const dates = dateArray(from, to);

  // Run the profile
  log(
    `Running strategy '${runProfile.strategy.name}' for tickers ${symbols.join(
      ', ',
    )} from ${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`,
  );

  log(`Starting ${runProfile.threads} threads`);

  const pool = new StaticPool({
    size: runProfile.threads | 1,
    task: filePath,
    workerData: {
      profile: runProfile,
    },
  });

  const dataProvider = createDataProvider({type: 'backtest'});

  // connect
  await dataProvider.init();

  const strategy = await loadStrategy(
    Env.getUserPath(`./test-strategies/${runProfile.strategy.name}.ts`),
  );

  if (!strategy) {
    throw new BacktestControllerError('invalid-profile');
  }

  // create an instance of the strategy for each symbol to get a list of extra symbols
  const {extraSymbols} = strategy;

  const symbolsThatRequireData = Array.from(
    new Set([...symbols, ...extraSymbols]),
  );

  // Make sure we have
  await ensureSymbolsAreAvailable({
    dataProvider,
    symbols: symbolsThatRequireData,
  });

  await ensureBarDataIsAvailable({
    dataProvider,
    symbols: symbolsThatRequireData,
    log,
    from,
    to,
  });

  await series(
    async date => {
      await ensureTickDataIsAvailable({
        dataProvider,
        symbols: symbolsThatRequireData,
        log,
        date,
      });
    },
    5,
    dates,
  );

  const start = Date.now();

  const dateSymbolCombos = runProfile.dates.dates
    .map(date => {
      return symbols.map(symbol => ({
        date,
        symbol,
      }));
    })
    .flat();

  const results = await Promise.all(
    dateSymbolCombos.map(async ({date, symbol}) => {
      // This will choose one idle worker in the pool
      // to execute your heavy task without blocking
      // the main thread!
      const result = (await pool.exec({
        symbol,
        date,
      })) as WorkerResult;

      switch (result.error) {
        case 'no-symbol-data':
          log('Some symbol data is missing, ignoring');
          break;

        case 'strategy-not-found':
          log('Strategy not found, ignoring');
          break;

        case 'unknown':
          log('An unknown error occurred');
          break;
      }

      return result;
    }),
  );

  log(`Finished in ${numeral(Date.now() - start).format(',')}ms`);

  // Shutdown the pool
  await pool.destroy();

  // Disconnect from data provider
  await dataProvider.shutdown();

  const positions = results
    .filter(val => !val.error)
    .flatMap(val => val.positions || []);

  const logs = results.flatMap(r => r.logs);

  log(`Got ${logs.length} logs for ${results.length} results`);

  return {
    createdAt: new Date(),
    positions,
    profile: runProfile,
    logs,
  };
}
