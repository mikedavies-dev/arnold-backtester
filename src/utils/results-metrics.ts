import {pipe} from 'fp-ts/lib/function';
import {Position, Order} from '../backtest/broker';
import {incIf, ratio} from './logic';

/*
Take a list of positions and return some stats, return:

DONE:
- Total positions
- Total orders
- Deposit
- Net profit

- Short trades
- Short trades (percent won)

- Long trades
- Long trades (percent won)

- Total commission paid

PENDING:

- Gross profit
- Gross loss
- Profit factor

- Sharp ratio

- Max consecutive win count
- Max consecutive win amount ($)
- Max consecutive loss count
- Max consecutive loss amount ($)

- Max drawdown
- Average profit per position

- Entries by: array of number [0-23])
 - Hour
 - Weekday
 
- Profit/loss by: array of number [0-23]
 - Hour
 - Weekday
*/

type Options = {
  accountSize: number;
  commissionPerTrade: number;
};

type Metrics = {
  accumulatedPnL: number;
  commission: number;
  longPositions: number;
  longWinners: number;
  shortPositions: number;
  shortWinners: number;
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

export function handleConsecutivePositionWin(
  state: ConsecutivePositions,
  positionPnL: number,
) {
  state.currentConsecutiveLosses = 0;
  state.currentConsecutiveLossAmount = 0;

  state.currentConsecutiveWins += 1;
  state.currentConsecutiveWinAmount += positionPnL;

  if (state.currentConsecutiveWins > state.maxConsecutiveWins) {
    state.maxConsecutiveWins = state.currentConsecutiveWins;
  }

  if (state.currentConsecutiveWinAmount > state.maxConsecutiveWinAmount) {
    state.maxConsecutiveWinAmount = state.currentConsecutiveWinAmount;
  }
}

export function handleConsecutivePositionLoss(
  state: ConsecutivePositions,
  positionPnL: number,
) {
  state.currentConsecutiveWins = 0;
  state.currentConsecutiveWinAmount = 0;

  state.currentConsecutiveLosses += 1;
  state.currentConsecutiveLossAmount += Math.abs(positionPnL); // get the absolute value

  if (state.currentConsecutiveLosses > state.maxConsecutiveLosses) {
    state.maxConsecutiveLosses = state.currentConsecutiveLosses;
  }

  if (state.currentConsecutiveLossAmount > state.maxConsecutiveLossAmount) {
    state.maxConsecutiveLossAmount = state.currentConsecutiveLossAmount;
  }
}

export function calculateMetrics(positions: Array<Position>, options: Options) {
  const initialData: Metrics = {
    accumulatedPnL: options.accountSize,
    commission: 0,
    longPositions: 0,
    longWinners: 0,
    shortPositions: 0,
    shortWinners: 0,
  };

  const consecutive: ConsecutivePositions = {
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

    // consecutive wins/losses (mutate!)
    if (isWinner) {
      handleConsecutivePositionWin(consecutive, positionPnL);
    } else {
      handleConsecutivePositionLoss(consecutive, positionPnL);
    }

    return {
      ...acc,
      accumulatedPnL: acc.accumulatedPnL + positionPnL,
      commission: acc.commission + commission,
      longPositions: incIf(direction === 'LONG', acc.longPositions),
      longWinners: incIf(direction === 'LONG' && isWinner, acc.longWinners),
      shortPositions: incIf(direction === 'SHORT', acc.shortPositions),
      shortWinners: incIf(direction === 'SHORT' && isWinner, acc.shortWinners),
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
