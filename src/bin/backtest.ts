import Commander from 'commander';
import numeral from 'numeral';

import {render as renderTable} from '../ui/cli/utils/table';
import Logger from '../utils/logger';
import {runBacktestController} from '../backtest/controller';
import {calculateMetrics} from '../utils/results-metrics';
import {formatDateTime} from '../utils/dates';
import {
  positionAction,
  positionCommission,
  positionRealisedPnL,
} from '../utils/derived';
import {isNumeric} from '../utils/strings';

import {
  connect,
  storeBacktestResults,
  disconnect,
  getBacktests,
  getBacktest,
  getLastBacktest,
} from '../utils/db';
import {differenceInSeconds} from 'date-fns';

const metricOptions = {
  accountSize: 10000,
  commissionPerOrder: 1,
};

const log = Logger('backtest');

async function dbAction(cb: () => Promise<void>) {
  try {
    await connect();
    await cb();
  } catch (err) {
    log('Failed', err);
  } finally {
    await disconnect();
  }
}

async function getBacktestFromInput(input: string | undefined) {
  if (isNumeric(input)) {
    const backtests = await getBacktests();
    return backtests.at(Number(input)) || null;
  }

  if (input) {
    return getBacktest(input);
  }

  // get the last backtest
  return getLastBacktest();
}

async function list() {
  return dbAction(async () => {
    const backtests = await getBacktests();

    renderTable({
      columns: [
        {
          label: 'ix',
          width: 5,
          align: 'left',
        },
        {
          label: 'id',
          width: 28,
          align: 'left',
        },
        {
          label: 'date',
          width: 22,
          align: 'left',
        },
        {
          label: 'strategy',
          width: 20,
          align: 'left',
        },
        {
          label: 'pnl',
          width: 11,
          align: 'right',
        },
        {
          label: 'factor',
          width: 10,
          align: 'right',
        },
        {
          label: 'positions',
          width: 12,
          align: 'right',
        },
      ],

      rows: backtests.map((backtest, ix) => {
        const metrics = calculateMetrics(backtest.positions, metricOptions);
        return [
          `${ix}`,
          `${backtest._id}`,
          formatDateTime(backtest.createdAt),
          backtest.profile.strategy.name,
          numeral(metrics.netProfitAndLoss).format('0,0.00'),
          numeral(metrics.profitFactor).format('0,0.00'),
          backtest.positions.length.toString(),
        ];
      }),
    });
  });
}

async function logs(backtestId: string | undefined) {
  return dbAction(async () => {
    const backtest = await getBacktestFromInput(backtestId);

    if (!backtest) {
      log(`No backtest found for ${backtestId}`);
      return;
    }

    backtest.logs.forEach(msg => console.log(msg.msg));
  });
}

async function stats(backtestId: string | undefined) {
  const currency = (val: number) => numeral(val).format('$0.00');
  return dbAction(async () => {
    const backtest = await getBacktestFromInput(backtestId);

    if (!backtest) {
      log(`No backtest found for ${backtestId}`);
      return;
    }

    const metrics = calculateMetrics(backtest.positions, metricOptions);

    renderTable({
      columns: [
        {
          label: 'stat',
          width: 20,
          align: 'left',
        },
        {
          label: 'value',
          width: 20,
          align: 'right',
        },
      ],
      rows: [
        ['gross', currency(metrics.grossProfitAndLoss)],
        ['commission', currency(metrics.commission)],
        ['net', currency(metrics.netProfitAndLoss)],
        ['-'],
        ['max drawdown', currency(metrics.maxDrawdown)],
        ['profit factor', currency(metrics.profitFactor)],
      ],
    });

    renderTable({
      columns: [
        {
          label: 'symbol',
          width: 8,
          align: 'left',
        },
        {
          label: 'opened',
          width: 22,
          align: 'left',
        },
        {
          label: 'closed',
          width: 22,
          align: 'left',
        },
        {
          label: 'action',
          width: 8,
          align: 'left',
        },
        {
          label: 'mins',
          width: 8,
          align: 'right',
        },
        {
          label: 'gross',
          width: 10,
          align: 'right',
        },
        {
          label: 'fee',
          width: 8,
          align: 'right',
        },
        {
          label: 'net',
          width: 10,
          align: 'right',
        },
        {
          label: 'close reason',
          width: 50,
          align: 'left',
        },
      ],
      rows: backtest.positions.map(position => {
        const commission = positionCommission(position);
        const pnl = positionRealisedPnL(position);
        return [
          position.symbol,
          formatDateTime(position.openedAt),
          formatDateTime(position.closedAt as Date),
          positionAction(position),
          `${numeral(
            differenceInSeconds(position.closedAt as Date, position.openedAt) /
              60,
          ).format('0.0')}`,
          currency(pnl),
          currency(commission),
          currency(pnl - commission),
          position.closeReason || '',
        ];
      }),
    });
  });
}

async function run(profile: string) {
  return dbAction(async () => {
    const results = await runBacktestController({
      log,
      profile,
    });

    const stored = await storeBacktestResults(results);

    if (stored._id) {
      await stats(stored._id?.toString());
    }
  });
}

const {program} = Commander;

// run a new backtest
program
  .command('run [profile]')
  .description('Run a backtest profile')
  .action((profile: string) => run(profile));

// list existing backtests
program.command('ls').description('list previously run backtests').action(list);

// show an existing backtest logs

program
  .command('logs [backtestId]')
  .description('list previously run backtests')
  .action(logs);

// show and existing backtests results
program
  .command('stats [backtestId]')
  .description('list previously run backtests')
  .action(stats);

program.parse();
