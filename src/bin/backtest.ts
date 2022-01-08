import {format} from 'date-fns';
import {StaticPool} from 'node-worker-threads-pool';
import numeral from 'numeral';

import Logger from '../utils/logger';
import {profileExists, loadProfile} from '../utils/profile';
import path from 'path';

const log = Logger('backtest');

const baseFolder = path.parse(__filename).dir;
const filePath = path.join(baseFolder, './worker.js');

async function run() {
  const args = process.argv.slice(2);

  if (!args.length) {
    log('Please specify a profile');
    return;
  }

  const [profile] = args;
  log(`Loading profile '${profile}'`);

  if (!(await profileExists(profile))) {
    log(`${profile} does not appear to be a valid profile`);
    return;
  }

  const runProfile = await loadProfile(profile);

  // Run the profile
  log(
    `Running strategy '${
      runProfile.strategy
    }' for tickers ${runProfile.symbols.join(', ')} from ${format(
      runProfile.dates.from,
      'yyyy-MM-dd',
    )} to ${format(runProfile.dates.to, 'yyyy-MM-dd')}`,
  );

  log(`Starting ${runProfile.threads} threads`);

  const pool = new StaticPool({
    size: runProfile.threads,
    task: filePath,
    workerData: {
      profile: runProfile,
    },
  });

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
      return await pool.exec({
        symbol,
        date,
      });
    }),
  );

  log(`Finished in ${numeral(Date.now() - start).format(',')}ms`);
  log('Results', results);

  // Shutdown the pool
  pool.destroy();
}

run();
