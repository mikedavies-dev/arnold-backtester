import Commander from 'commander';

import Logger from '../utils/logger';
import {parseDate} from '../utils/dates';

import {connect, disconnect, loadPositionsForDateRange} from '../utils/db';
import {positionsCsv, positionsHeaders} from '../utils/csv-export';

const log = Logger('backtest');

const {program} = Commander;

program
  .description('Export live positions to CSV')
  .usage('[OPTIONS]...')
  .requiredOption(
    '-f, --from <from>',
    'from date to export in YYYY-MM-DD format',
  )
  .requiredOption('-t, --to <to>', 'to date to export in YYYY-MM-DD format')
  .option('-h, --headers', 'include headers in the csv', false)
  .parse();

const options = program.opts<{headers: boolean; from: string; to: string}>();

async function run() {
  try {
    const from = parseDate(options.from);
    const to = parseDate(options.to);

    // TODO, validate this inside Commander once we have internet and can
    // check the docs
    if (!from || !to) {
      log('Dates do not appear to be valid');
      return;
    }

    await connect();

    const positions = await loadPositionsForDateRange(from, to);

    process.stdout.write(positionsCsv(positions));
    process.stdout.write(positionsHeaders());
  } catch (err) {
    log(`Failed to run backtest`, err);
  } finally {
    await disconnect();
  }
}

run();
