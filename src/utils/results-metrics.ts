import {getHours, getDay} from 'date-fns';
import {pipe} from 'fp-ts/lib/function';
import {Position, Order} from '../backtest/broker';
import {incIf, ratio, initArrayOfSize} from './logic';

/*
PENDING:

- Sharp ratio
- Sortino ratio

- Std div of average order PnL (and %)
- Some kind of factor from avg order PnL to std div that favors a stable distribution?

 a way of overriding the shares traded, i.e. some kind of position calculation based on current account
 size and the share price. To do this we'd need to know the max loss per trade and possibly the stoploss?

 We can define the max loss as a percent of the account balance but we need to define the stoploss to be able
 to calculate the number of shares. Or should we leave this down to the system and if we want to adjust the
 settings then we update the profile and re-run the backtest?

 I think the strategy should have access to the account balance so it can calculate how many shares to purchase
 this is how the real system would work.. probably.. or would the real system be managed by some kind of
 portfolio management system? Probably not, at least not in the first version, we could potentially allocate
 an account size to each strategy

 References:
  https://github.com/mdeverdelhan/ta4j-origins/blob/master/ta4j/src/main/java/eu/verdelhan/ta4j/analysis/criteria/MaximumDrawdownCriterion.java
  https://www.javatips.net/api/tradelib-master/src/main/java/net/tradelib/ratio/SharpeRatio.java
  https://www.javatips.net/api/tradelib-master/src/main/java/net/tradelib/ratio/SortinoRatio.java
  https://github.com/dcajasn/Riskfolio-Lib/blob/master/riskfolio/RiskFunctions.py
  https://github.com/lequant40/portfolio_analytics_js
  https://analyzingalpha.com/profit-factor#:~:text=The%20profit%20factor%20is%20the,above%203.0%20is%20considered%20outstanding.
*/

type Options = {
  accountSize: number;
  commissionPerOrder: number;
};

type RunningPositionMetrics = {
  at?: Date;
  pnl: number;
  drawdown: number;
  accountBalance: number;
};

export type MetricsByPeriod = {
  positions: number;
  orders: number;
  commission: number;
  grossProfit: number;
  grossLoss: number;
  longPositions: number;
  longWinners: number;
  shortPositions: number;
  shortWinners: number;
  longWinnerPercent: number;
  shortWinnerPercent: number;
  profitFactor: number;
  grossProfitAndLoss: number;
};

type Metrics = MetricsByPeriod & {
  byHour: Array<MetricsByPeriod>;
  byDayOfWeek: Array<MetricsByPeriod>;
};

export type PositionDirection = 'LONG' | 'SHORT' | 'UNKNOWN';

const emptyPeriodData: MetricsByPeriod = {
  orders: 0,
  positions: 0,
  longPositions: 0,
  longWinners: 0,
  shortPositions: 0,
  shortWinners: 0,
  longWinnerPercent: 0,
  shortWinnerPercent: 0,
  grossProfit: 0,
  grossLoss: 0,
  profitFactor: 0,
  commission: 0,
  grossProfitAndLoss: 0,
};

export const totalOrderValue = (orders: Array<Order>) =>
  orders.reduce(
    (acc, order) => acc + (order.avgFillPrice || 0) * order.shares,
    0,
  );

const filledOrders = (order: Order) => order.state === 'FILLED';
const buyOrders = (order: Order) => order.action === 'BUY';
const sellOrders = (order: Order) => order.action === 'SELL';

const filterOrders =
  (predicate: (order: Order) => boolean) => (orders: Array<Order>) =>
    orders.filter(predicate);

export function getPositionPL(position: Position) {
  const totalBuyValue = pipe(
    position.orders,
    filterOrders(filledOrders),
    filterOrders(buyOrders),
    totalOrderValue,
  );

  const totalSellValue = pipe(
    position.orders,
    filterOrders(filledOrders),
    filterOrders(sellOrders),
    totalOrderValue,
  );

  return totalSellValue - totalBuyValue;
}

export function getPositionCommission(
  position: Position,
  commissionPerOrder: number,
) {
  return (
    position.orders.filter(o => o.state === 'FILLED').length *
    commissionPerOrder
  );
}

export function getPositionDirection(position: Position): PositionDirection {
  if (!position.orders.length) {
    return 'UNKNOWN';
  }

  return position.orders[0].action === 'BUY' ? 'LONG' : 'SHORT';
}

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

  return {
    commission: metrics.commission + commissionPerOrder * orderCount,
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
    profitFactor: ratio(grossProfit, grossLoss || 1),
    grossProfitAndLoss: metrics.grossProfitAndLoss + positionPnL,
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

  const metrics = positions.reduce((acc, position) => {
    const direction = getPositionDirection(position);
    const positionPnL = getPositionPL(position);
    const positionPnLWithCommission =
      positionPnL - getPositionCommission(position, options.commissionPerOrder);
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
    } = metricsByPosition.length
      ? metricsByPosition[metricsByPosition.length - 1]
      : {drawdown: 0, accountBalance: options.accountSize, pnl: 0};

    // Add the next running total
    const firstFilledOrder = position.orders.find(o => o.state === 'FILLED');

    metricsByPosition.push({
      at: firstFilledOrder?.filledAt,
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
  };
}
