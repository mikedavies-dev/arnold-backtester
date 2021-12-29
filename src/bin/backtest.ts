import Logger from '../utils/logger';
import {profileExists, loadProfile} from '../utils/profile';
import {format} from 'date-fns';
import series from 'promise-series2';
import {StaticPool} from 'node-worker-threads-pool';
import path from 'path';

const log = Logger('backtest');

const baseFolder = path.parse(__filename).dir;
const filePath = path.join(baseFolder, './worker.ts');

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

  const threadCount = 1;
  log(`Starting ${threadCount} threads`);

  const pool = new StaticPool({
    size: threadCount,
    task: filePath,
    workerData: {},
  });

  const dateSymbolCombos = new Array(
    runProfile.dates.dates.length * runProfile.symbols.length,
  )
    .fill(null)
    .map(() => {
      return {
        date: null,
        symbol: null,
      };
    });

  await Promise.all(
    dateSymbolCombos.map(async ({date, symbol}) => {
      // This will choose one idle worker in the pool
      // to execute your heavy task without blocking
      // the main thread!
      await pool.exec({
        symbol,
        date,
      });
    }),
  );

  // Shutdown the pool
  pool.destroy();

  /*
  // Run the threads
  await series<Date, void>(
    async function (date) {
      log(`Running ${format(date, 'yyyy-MM-dd')}`);
    },
    false,
    runProfile.dates.dates,
  );
  */
}

run();
