import Commander from 'commander';
import {stringify} from 'csv-stringify/sync';
import {isValid} from 'date-fns';

import Logger from '../utils/logger';
import {parseDate, formatDateTime} from '../utils/dates';

import {connect, disconnect, loadPositionsForDateRange} from '../utils/db';
import {
  positionCommission,
  positionRealisedPnL,
  positionSize,
  positionAction,
  isFilledOrder,
} from '../utils/derived';

import {getLiveConfig} from '../utils/live-config';

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
    if (!isValid(from) || !isValid(to)) {
      log('Dates do not appear to be valid');
      return;
    }

    await connect();

    const positions = await loadPositionsForDateRange(from, to);

    const {profiles} = await getLiveConfig();

    const data = positions
      .filter(p => p.closedAt)
      .map(position => {
        if (!position.closedAt) {
          return null;
        }

        const profile = profiles.find(p => p.id === position.profileId);

        return [
          position.externalId,
          position.profileId,
          profile?.name,
          position.symbol,
          positionAction(position),
          positionSize(position).toFixed(2),
          formatDateTime(position.openedAt),
          formatDateTime(position.closedAt),
          positionCommission(position).toFixed(2),
          positionRealisedPnL(position).toFixed(2),
          position.orders.length,
          position.orders.filter(isFilledOrder).length,
          position.closeReason,
        ];
      })
      .filter(Boolean);

    if (options.headers) {
      process.stdout.write(
        stringify([
          [
            'id',
            'profileId',
            'profileName',
            'symbol',
            'action',
            'size',
            'openedAt',
            'closedAt',
            'commission',
            'pnl',
            'totalOrders',
            'filledOrders',
            'closeReason',
          ],
        ]),
      );
    }

    process.stdout.write(stringify([...data]));
  } catch (err) {
    log(`Failed to run backtest`, err);
  } finally {
    await disconnect();
  }
}

run();
