import Commander from 'commander';
import numeral from 'numeral';

import {render as renderTable} from '../ui/cli/utils/table';
import Logger from '../utils/logger';
import {runBacktestController} from '../backtest/controller';
import {calculateMetrics} from '../utils/results-metrics';
import {formatDateTime, parseDate} from '../utils/dates';
import {
  positionAction,
  positionAvgEntryPrice,
  positionAvgExitPrice,
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
import {positionsCsv, positionsHeaders} from '../utils/csv-export';
import {Position} from '../core';
import {colorize} from '../ui/cli/utils/format';

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

function displayResults(positions: Position[]) {
  const currency = (val: number) => numeral(val).format('0.00');
  const pips = (val: number) => numeral(val).format('0.00000');
  const metrics = calculateMetrics(positions, metricOptions);

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
      ['profit factor', numeral(metrics.profitFactor).format('0.00')],
      ['win rate', numeral(metrics.winRate).format('0.00%')],
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
        label: 'action',
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
        label: 'mins',
        width: 8,
        align: 'right',
      },
      {
        label: 'avg entry',
        width: 13,
        align: 'right',
      },
      {
        label: 'avg exit',
        width: 13,
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
        width: 25,
        align: 'left',
      },
    ],
    rows: positions.map(position => {
      const commission = positionCommission(position);
      const pnl = positionRealisedPnL(position);
      return [
        position.symbol,
        positionAction(position),
        formatDateTime(position.openedAt),
        position.closedAt
          ? formatDateTime(position.closedAt as Date)
          : 'NOT_CLOSED',
        position.closedAt
          ? `${numeral(
              differenceInSeconds(
                position.closedAt as Date,
                position.openedAt,
              ) / 60,
            ).format('0.0')}`
          : 'NOT_CLOSED',
        pips(positionAvgEntryPrice(position) || 0),
        pips(positionAvgExitPrice(position) || 0),
        colorize(pnl)(currency(pnl)),
        currency(commission),
        currency(pnl - commission),
        position.closeReason || '',
      ];
    }),
  });
}

async function stats(backtestId: string | undefined) {
  return dbAction(async () => {
    const backtest = await getBacktestFromInput(backtestId);

    if (!backtest) {
      log(`No backtest found for ${backtestId}`);
      return;
    }

    displayResults(backtest.positions);
  });
}

async function run(
  profile: string,
  {
    symbol,
    date,
    keep,
  }: {symbol: string | null; date: Date | null; keep: boolean},
) {
  return dbAction(async () => {
    const results = await runBacktestController({
      log,
      profile,
      symbol,
      date,
      keep,
    });

    if (keep) {
      await storeBacktestResults(results);
    }

    displayResults(results.positions);
  });
}

async function csv(backtestId: string | undefined) {
  return dbAction(async () => {
    const backtest = await getBacktestFromInput(backtestId);

    if (!backtest) {
      log(`No backtest found for ${backtestId}`);
      return;
    }

    process.stdout.write(positionsHeaders());
    process.stdout.write(positionsCsv(backtest.positions));
  });
}

const {program} = Commander;

// run a new backtest
program
  .command('run [profile]')
  .description('Run a backtest profile')
  .option('-s, --symbol <symbol>', 'the symbol to test', '')
  .option('-d, --date <date>', 'date to test', '')
  .option('-k, --keep', 'save the results to mongo', '')
  .action(
    (
      profile: string,
      options: {
        symbol: string;
        date: string;
        keep: boolean;
      },
    ) => {
      run(profile, {
        symbol: options.symbol || null,
        date: options.date ? parseDate(options.date) : null,
        keep: options.keep,
      });
    },
  );

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

program
  .command('csv [backtestId]')
  .description('export backtest positions as csv')
  .action(csv);

program.parse();
