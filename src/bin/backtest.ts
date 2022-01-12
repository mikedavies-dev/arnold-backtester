import Logger from '../utils/logger';
import {runBacktestController} from '../backtest/controller';

const log = Logger('backtest');

function run() {
  const args = process.argv.slice(2);

  if (!args.length) {
    log('Please specify a profile');
    return;
  }

  runBacktestController({
    log,
    profile: args[0],
  });
}

run();
