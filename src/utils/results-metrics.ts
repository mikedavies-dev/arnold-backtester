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

export function totalOrderValue(orders: Array<Order>) {
  return orders.reduce(
    (acc, order) => acc + (order.avgFillPrice || 0) * order.shares,
    0,
  );
}

export function getPositionPL(position: Position) {
  const filledOrders = position.orders.filter(o => o.state === 'FILLED');

  const buyValue = totalOrderValue(
    filledOrders.filter(o => o.action === 'BUY'),
  );

  const sellValue = totalOrderValue(
    filledOrders.filter(o => o.action === 'SELL'),
  );

  return sellValue - buyValue;
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
