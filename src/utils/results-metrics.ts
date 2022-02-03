import {pipe} from 'fp-ts/lib/function';
import {Position, Order} from '../backtest/broker';

/*
Take a list of positions and return some stats, return:

- Deposit
- Net profit
- Gross profit
- Gross loss
- Profit factor

- Total positions
- Total orders

- Sharp ratio

- Short trades
- Short trades (percent won)

- Long trades
- Long trades (percent won)

- Max consecutive win count
- Max consecutive win amount ($)
- Max consecutive loss count
- Max consecutive loss amount ($)

- Total commission paid
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

export function calculateMetrics(positions: Array<Position>, options: Options) {
  const results = positions.reduce(
    (acc, position) => {
      // Calculate commission
      const commission = options.commissionPerTrade * position.orders.length;

      return {
        ...acc,
        accumulatedPnL: acc.accumulatedPnL + getPositionPL(position),
        commission: acc.commission + commission,
      };
    },
    {
      accumulatedPnL: options.accountSize,
      commission: 0,
    } as Metrics,
  );

  return {
    ...results,
    positions: positions.length,
    grossProfit: results.accumulatedPnL,
    netProfit: results.accumulatedPnL - results.commission,
    orders: positions.reduce((acc, p) => acc + p.orders.length, 0),
  };
}
