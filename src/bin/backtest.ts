import Commander from 'commander';

import Logger from '../utils/logger';
import {
  runBacktestController,
  BacktestControllerError,
} from '../backtest/controller';

import {connect, storeBacktestResults, disconnect} from '../utils/db';

const {program} = Commander;

program
  .description('Run a backtest profile')
  .usage('[OPTIONS]...')
  .requiredOption('-p, --profile <profile>', 'the name of the profile to run')
  .option(
    '-f, --fetchOnly',
    'download data without running the backtest',
    false,
  )
  .parse();

const options = program.opts<{profile: string; fetchOnly: boolean}>();

const log = Logger('backtest');

async function run() {
  try {
    log('Connecting to database');
    await connect();

    const results = await runBacktestController({
      log,
      profile: options.profile,
      fetchOnly: options.fetchOnly,
    });

    if (!options.fetchOnly) {
      await storeBacktestResults(results);
    }
  } catch (err) {
    const errorCode =
      err instanceof BacktestControllerError ? err.code : 'unknown';
    log(`Failed to run backtest: ${errorCode}`, err);
  } finally {
    await disconnect();
    log('Finished!');
  }
}

run();
