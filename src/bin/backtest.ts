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
  .parse();

const options = program.opts<{profile: string}>();

const log = Logger('backtest');

async function run() {
  try {
    log('Connecting to database');
    await connect();

    const results = await runBacktestController({
      log,
      profile: options.profile,
    });

    await storeBacktestResults(results);
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
