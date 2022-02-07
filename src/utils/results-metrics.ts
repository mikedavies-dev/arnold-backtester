/*
References:
  https://github.com/mdeverdelhan/ta4j-origins/blob/master/ta4j/src/main/java/eu/verdelhan/ta4j/analysis/criteria/MaximumDrawdownCriterion.java
  https://www.javatips.net/api/tradelib-master/src/main/java/net/tradelib/ratio/SharpeRatio.java
  https://www.javatips.net/api/tradelib-master/src/main/java/net/tradelib/ratio/SortinoRatio.java
  https://github.com/dcajasn/Riskfolio-Lib/blob/master/riskfolio/RiskFunctions.py
  https://github.com/lequant40/portfolio_analytics_js
  https://analyzingalpha.com/profit-factor#:~:text=The%20profit%20factor%20is%20the,above%203.0%20is%20considered%20outstanding.
*/

import {getHours, getDay} from 'date-fns';
import {pipe} from 'fp-ts/lib/function';
import {Position, Order} from '../backtest/broker';
import {incIf, ratio, initArrayOfSize} from './logic';

/*
Take a list of positions and return some stats, return:

DONE:
- Total positions
- Total orders
- Deposit
- Net profit
- Gross profit

- Short trades
- Short trades (percent won)

- Long trades
- Long trades (percent won)

- Total commission paid

- Max consecutive win count
- Max consecutive win amount ($)
- Max consecutive loss count
- Max consecutive loss amount ($)

PENDING:

- Gross profits (sum of all winning trades)
- Gross losses (sum of all loosing trades)
- Profit factor (the ratio of gross profits to gross losses)

- Sharp ratio
- Sortino ratio

- Average order PnL (and %)
- Std div of average order PnL (and %)
- Some kind of factor from avg order PnL to std div that favors a stable distribution?

- Max drawdown

- Running stats by positions
  - Current balance
  - Current drawdown

- Stats by hours of day: array of number [0-23])
 - Positions
 - PnL
 - PnL %
 
- Stats by day of week: array of number [0-6])
 - Positions
 - PnL
 - PnL %

 a way of overriding the shares traded, i.e. some kind of position calculation based on current account
 size and the share price. To do this we'd need to know the max loss per trade and possibly the stoploss?

 We can define the max loss as a percent of the account balance but we need to define the stoploss to be able
 to calculate the number of shares. Or should we leave this down to the system and if we want to adjust the
 settings then we update the profile and re-run the backtest?

 I think the strategy should have access to the account balance so it can calculate how many shares to purchase
 this is how the real system would work.. probably.. or would the real system be managed by some kind of
 portfolio management system? Probably not, at least not in the first version, we could potentially allocate
 an account size to each strategy
*/

type Options = {
  accountSize: number;
  commissionPerTrade: number;
};

type MetricsByPeriod = {
  accumulatedPnL: number;
  commission: number;
  longPositions: number;
  longWinners: number;
  shortPositions: number;
  shortWinners: number;
};

type Metrics = MetricsByPeriod & {
  byHour: Array<MetricsByPeriod>;
  byDayOfWeek: Array<MetricsByPeriod>;
};

type PositionDirection = 'LONG' | 'SHORT' | 'UNKNOWN';

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

function updatePeriodMetrics(
  metrics: MetricsByPeriod,
  positionPnL: number,
  commission: number,
  direction: PositionDirection,
  isWinner: boolean,
): MetricsByPeriod {
  return {
    accumulatedPnL: metrics.accumulatedPnL + positionPnL,
    commission: metrics.commission + commission,
    longPositions: incIf(direction === 'LONG', metrics.longPositions),
    longWinners: incIf(direction === 'LONG' && isWinner, metrics.longWinners),
    shortPositions: incIf(direction === 'SHORT', metrics.shortPositions),
    shortWinners: incIf(
      direction === 'SHORT' && isWinner,
      metrics.shortWinners,
    ),
  };
}

export function calculateMetrics(positions: Array<Position>, options: Options) {
  const initialData: Metrics = {
    accumulatedPnL: options.accountSize,
    commission: 0,
    longPositions: 0,
    longWinners: 0,
    shortPositions: 0,
    shortWinners: 0,
    byHour: initArrayOfSize(24, {
      accumulatedPnL: 0,
      commission: 0,
      longPositions: 0,
      longWinners: 0,
      shortPositions: 0,
      shortWinners: 0,
    }),
    byDayOfWeek: initArrayOfSize(7, {
      accumulatedPnL: 0,
      commission: 0,
      longPositions: 0,
      longWinners: 0,
      shortPositions: 0,
      shortWinners: 0,
    }),
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

  const results = positions.reduce((acc, position) => {
    // TODO, maybe we want some kind of dynamic commission calculation here?
    const commission = options.commissionPerTrade * position.orders.length;

    const direction = getPositionDirection(position);
    const positionPnL = getPositionPL(position);
    const isWinner = positionPnL >= 0;

    // consecutive wins/losses
    consecutive = isWinner
      ? updateConsecutivePositionWin(consecutive, positionPnL)
      : updateConsecutivePositionLoss(consecutive, positionPnL);

    if (position.orders.length) {
      // update hourly metrics
      const {openedAt} = position.orders[0];
      const hour = getHours(openedAt);
      acc.byHour[hour] = updatePeriodMetrics(
        acc.byHour[hour],
        positionPnL,
        commission,
        direction,
        isWinner,
      );

      // update hourly stats
      const day = getDay(openedAt);
      acc.byDayOfWeek[day] = updatePeriodMetrics(
        acc.byDayOfWeek[day],
        positionPnL,
        commission,
        direction,
        isWinner,
      );
    }
    return {
      ...acc,
      ...updatePeriodMetrics(acc, positionPnL, commission, direction, isWinner),
    };
  }, initialData);

  return {
    ...results,
    positions: positions.length,
    grossProfit: results.accumulatedPnL,
    netProfit: results.accumulatedPnL - results.commission,
    orders: positions.reduce((acc, p) => acc + p.orders.length, 0),
    longWinnerPercent: ratio(results.longWinners, results.longPositions),
    shortWinnerPercent: ratio(results.shortWinners, results.shortPositions),
    maxConsecutiveWins: consecutive.maxConsecutiveWins,
    maxConsecutiveLosses: consecutive.maxConsecutiveLosses,
    maxConsecutiveWinAmount: consecutive.maxConsecutiveWinAmount,
    maxConsecutiveLossAmount: consecutive.maxConsecutiveLossAmount,
  };
}
