import {format} from 'date-fns';
import {StaticPool} from 'node-worker-threads-pool';
import numeral from 'numeral';
import path from 'path';

import Env from '../utils/env';

import {LoggerCallback, Position, Profile} from '../core';
import {profileExists, loadBacktestProfile} from '../utils/profile';
import {BackTestWorkerErrorCode} from '../backtest/worker';
import {
  ensureBarDataIsAvailable,
  ensureSymbolsAreAvailable,
} from '../utils/data-storage';
import {createDataProvider} from '../utils/data-provider';
import {loadStrategy} from '../utils/module';
import {ensureTickDataIsAvailable} from '../utils/tick-storage';
import series from 'promise-series2';

const baseFolder = path.parse(__filename).dir;
const filePath = path.join(baseFolder, '../bin/worker.js');

export type WorkerResult = {
  error?: BackTestWorkerErrorCode;
  positions?: Array<Position>;
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
}: {
  log: LoggerCallback;
  profile: string;
}): Promise<BacktestResults> {
  log(`Loading profile '${profile}'`);

  if (!(await profileExists(profile))) {
    throw new BacktestControllerError('invalid-profile');
  }

  const runProfile = await loadBacktestProfile(profile);

  // Run the profile
  log(
    `Running strategy '${
      runProfile.strategy.name
    }' for tickers ${runProfile.symbols.join(', ')} from ${format(
      runProfile.dates.from,
      'yyyy-MM-dd',
    )} to ${format(runProfile.dates.to, 'yyyy-MM-dd')}`,
  );

  log(`Starting ${runProfile.threads} threads`);

  const pool = new StaticPool({
    size: runProfile.threads | 1,
    task: filePath,
    workerData: {
      profile: runProfile,
    },
  });

  const dataProvider = createDataProvider();

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
    new Set([...runProfile.symbols, ...extraSymbols]),
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
    from: runProfile.dates.from,
    to: runProfile.dates.to,
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
    runProfile.dates.dates,
  );

  const start = Date.now();

  const dateSymbolCombos = runProfile.dates.dates
    .map(date => {
      return runProfile.symbols.map(symbol => ({
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

  return {
    createdAt: new Date(),
    positions,
    profile: runProfile,
  };
}
