import Logger from '../utils/logger';
import {
  runBacktestController,
  BacktestControllerError,
} from '../backtest/controller';

const log = Logger('backtest');

function run() {
  const args = process.argv.slice(2);

  if (!args.length) {
    log('Please specify a profile');
    return;
  }

  try {
    runBacktestController({
      log,
      profile: args[0],
    });
  } catch (err) {
    const errorCode =
      err instanceof BacktestControllerError ? err.code : 'unknown';
    log(`Failed to run backtest: ${errorCode}`);
  }
}

run();
