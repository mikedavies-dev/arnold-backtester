import {getHours, getDay} from 'date-fns';
import {Position, PositionDirection, MetricsByPeriod} from '../core';
import {incIf, ratio, initArrayOfSize} from './logic';

import {
  positionDirection,
  positionCommission,
  positionRealisedPnL,
} from './derived';

type Options = {
  accountSize: number;
  commissionPerOrder: number;
};

type RunningPositionMetrics = {
  pnl: number;
  drawdown: number;
  accountBalance: number;
};

type Metrics = MetricsByPeriod & {
  byHour: Array<MetricsByPeriod>;
  byDayOfWeek: Array<MetricsByPeriod>;
};

const emptyPeriodData: MetricsByPeriod = {
  orders: 0,
  positions: 0,
  longPositions: 0,
  longWinners: 0,
  shortPositions: 0,
  shortWinners: 0,
  longWinnerPercent: 0,
  shortWinnerPercent: 0,
  winRate: 0,
  grossProfit: 0,
  grossLoss: 0,
  profitFactor: 0,
  commission: 0,
  grossProfitAndLoss: 0,
  netProfitAndLoss: 0,
};

type ConsecutivePositions = {
  // Max data
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWinAmount: number;
  maxConsecutiveLossAmount: number;

  // Current data
  currentConsecutiveWins: number;
  currentConsecutiveLosses: number;
  currentConsecutiveWinAmount: number;
  currentConsecutiveLossAmount: number;
};

export function updateConsecutivePositionWin(
  state: ConsecutivePositions,
  positionPnL: number,
): ConsecutivePositions {
  const newState = {...state};

  newState.currentConsecutiveLosses = 0;
  newState.currentConsecutiveLossAmount = 0;

  newState.currentConsecutiveWins += 1;
  newState.currentConsecutiveWinAmount += positionPnL;

  if (newState.currentConsecutiveWins > newState.maxConsecutiveWins) {
    newState.maxConsecutiveWins = newState.currentConsecutiveWins;
  }

  if (newState.currentConsecutiveWinAmount > newState.maxConsecutiveWinAmount) {
    newState.maxConsecutiveWinAmount = newState.currentConsecutiveWinAmount;
  }

  return newState;
}

export function updateConsecutivePositionLoss(
  state: ConsecutivePositions,
  positionPnL: number,
): ConsecutivePositions {
  const newState = {...state};

  newState.currentConsecutiveWins = 0;
  newState.currentConsecutiveWinAmount = 0;

  newState.currentConsecutiveLosses += 1;
  newState.currentConsecutiveLossAmount += Math.abs(positionPnL); // get the absolute value

  if (newState.currentConsecutiveLosses > newState.maxConsecutiveLosses) {
    newState.maxConsecutiveLosses = newState.currentConsecutiveLosses;
  }

  if (
    newState.currentConsecutiveLossAmount > newState.maxConsecutiveLossAmount
  ) {
    newState.maxConsecutiveLossAmount = newState.currentConsecutiveLossAmount;
  }

  return newState;
}

export function updatePeriodMetrics(
  metrics: MetricsByPeriod,
  {
    orderCount,
    positionPnL,
    commissionPerOrder,
    direction,
  }: {
    orderCount: number;
    positionPnL: number;
    commissionPerOrder: number;
    direction: PositionDirection;
  },
): MetricsByPeriod {
  const isWinner = positionPnL >= 0;

  const shortWinners = incIf(
    direction === 'SHORT' && isWinner,
    metrics.shortWinners,
  );

  const longWinners = incIf(
    direction === 'LONG' && isWinner,
    metrics.longWinners,
  );

  const longPositions = incIf(direction === 'LONG', metrics.longPositions);

  const shortPositions = incIf(direction === 'SHORT', metrics.shortPositions);

  const grossProfit = isWinner
    ? metrics.grossProfit + positionPnL
    : metrics.grossProfit;

  const grossLoss = !isWinner
    ? metrics.grossLoss + Math.abs(positionPnL)
    : metrics.grossLoss;

  const commission = commissionPerOrder * orderCount;

  return {
    commission: metrics.commission + commission,
    longPositions,
    longWinners,
    shortPositions,
    shortWinners,
    orders: metrics.orders + orderCount,
    positions: metrics.positions + 1,
    grossProfit,
    grossLoss,
    longWinnerPercent: ratio(longWinners, longPositions),
    shortWinnerPercent: ratio(shortWinners, shortPositions),
    winRate: ratio(longWinners + shortWinners, longPositions + shortPositions),
    profitFactor: ratio(grossProfit, grossLoss || 1),
    grossProfitAndLoss: metrics.grossProfitAndLoss + positionPnL,
    netProfitAndLoss: metrics.netProfitAndLoss + (positionPnL - commission),
  };
}

export function calculateMetrics(positions: Array<Position>, options: Options) {
  const initialData: Metrics = {
    ...emptyPeriodData,
    byHour: initArrayOfSize(24, emptyPeriodData),
    byDayOfWeek: initArrayOfSize(7, emptyPeriodData),
  };

  let consecutive: ConsecutivePositions = {
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    maxConsecutiveWinAmount: 0,
    maxConsecutiveLossAmount: 0,
    currentConsecutiveWins: 0,
    currentConsecutiveLosses: 0,
    currentConsecutiveWinAmount: 0,
    currentConsecutiveLossAmount: 0,
  };

  const metricsByPosition: Array<RunningPositionMetrics> = [];

  let maxDrawdown = 0;

  metricsByPosition.push({
    pnl: 0,
    accountBalance: options.accountSize,
    drawdown: 0,
  });

  const metrics = positions.reduce((acc, position) => {
    const direction = positionDirection(position);
    const positionPnL = positionRealisedPnL(position);
    const positionPnLWithCommission =
      positionPnL - positionCommission(position);
    const isWinner = positionPnL >= 0;

    // consecutive wins/losses
    consecutive = isWinner
      ? updateConsecutivePositionWin(consecutive, positionPnL)
      : updateConsecutivePositionLoss(consecutive, positionPnL);

    const updateData = {
      orderCount: position.orders.length,
      positionPnL,
      commissionPerOrder: options.commissionPerOrder,
      direction,
    };

    if (position.orders.length) {
      const {openedAt} = position.orders[0];

      // update hourly metrics
      const hour = getHours(openedAt);
      acc.byHour[hour] = updatePeriodMetrics(acc.byHour[hour], updateData);

      // update hourly stats
      const day = getDay(openedAt);
      acc.byDayOfWeek[day] = updatePeriodMetrics(
        acc.byDayOfWeek[day],
        updateData,
      );
    }

    // update running totals
    const {
      pnl: currentPnL,
      drawdown: currentDrawdown,
      accountBalance: currentAccountBalance,
    } = metricsByPosition[metricsByPosition.length - 1];

    // Add the next running total
    metricsByPosition.push({
      pnl: currentPnL + positionPnLWithCommission,
      accountBalance: currentAccountBalance + positionPnLWithCommission,
      drawdown: Math.min(currentDrawdown + positionPnLWithCommission, 0),
    });

    // Calculate the maximum drawdown
    maxDrawdown = Math.min(
      metricsByPosition[metricsByPosition.length - 1].drawdown,
      maxDrawdown,
    );

    return {
      ...acc,
      ...updatePeriodMetrics(acc, updateData),
    };
  }, initialData);

  return {
    ...metrics,
    metricsByPosition,
    maxDrawdown,

    // Add consecutive win/loss data
    maxConsecutiveWins: consecutive.maxConsecutiveWins,
    maxConsecutiveLosses: consecutive.maxConsecutiveLosses,
    maxConsecutiveWinAmount: consecutive.maxConsecutiveWinAmount,
    maxConsecutiveLossAmount: consecutive.maxConsecutiveLossAmount,

    accountSize: options.accountSize,
    commissionPerOrder: options.commissionPerOrder,

    finalAccountBalance:
      metricsByPosition[metricsByPosition.length - 1].accountBalance,
  };
}

export type ResultsMetrics = ReturnType<typeof calculateMetrics>;
