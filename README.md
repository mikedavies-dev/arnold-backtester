# Arnold 💪 - Stock/Crypto Backtesting Platform

[![codecov](https://codecov.io/gh/ant-fx/arnold-backtester/branch/main/graph/badge.svg?token=1CF7QD9N5O)](https://codecov.io/gh/ant-fx/arnold-backtester)

The ethos behind Arnold is to allow for advanced backtesting of stocks using
tick and bid/ask data and provide a different order types like:

- Market
- Limit
- Stoploss (Trailing + Fixed)
- Bracket

It will also let you load other symbol data at the same time, for example you
could check the `SPY` while trading `MSFT`.

It should let you graphically analyse each trade in context to better help
understand the strategy.

## Sample Profile

```json
{
  "strategy": "sample",
  "initialBalance": 10000,
  "commissionPerOrder": 1,
  "dates": {
    "from": "2021-12-01",
    "to": "2021-12-03"
  },
  "symbols": ["MSFT"]
}
```

## Sample Strategy

```typescript
const shares = 100;

export function handleTick({
  tick,
  symbol,
  tracker,
  trackers,
  marketState,
  log,
  broker,
}: // accountSize - used to calculate share size
HandleTickParameters) {
  switch (tick.type) {
    case 'TRADE': {
      // Not a new high
      if (tick.value <= tracker.high) {
        return;
      }

      // We already have an open position or the market isn't open
      if (
        marketState !== 'OPEN' ||
        broker.getPositionSize(symbol) > 0 ||
        broker.hasOpenOrders(symbol)
      ) {
        return;
      }

      log(
        'Opening position on new high of day',
        symbol,
        tick.dateTime,
        tick.value,
      );

      const shares = 100;

      const buyOrderId = broker.placeOrder({
        type: 'MKT',
        shares,
        symbol,
        action: 'BUY',
      });

      // Place the trailing stop as a child of the opening order
      broker.placeOrder({
        parentId: buyOrderId,
        symbol,
        type: 'TRAIL',
        price: 0.5,
        action: 'SELL',
        shares,
      });
    }
  }
}
```

todo

## TODO

- Cleanup project layout
- Create basic express server
- Results viewer

## Ideal folder setup

- src/
  - bin/
  - backtest/
  - trader/
  - server/
    - public/
  - core/

## Metrics to add:

- Sharp ratio
- Sortino ratio
- Std div of average order PnL (and %)
- Some kind of factor from avg order PnL to std div that favors a stable
  distribution?

### References:

- https://github.com/mdeverdelhan/ta4j-origins/blob/master/ta4j/src/main/java/eu/verdelhan/ta4j/analysis/criteria/MaximumDrawdownCriterion.java
- https://www.javatips.net/api/tradelib-master/src/main/java/net/tradelib/ratio/SharpeRatio.java
- https://www.javatips.net/api/tradelib-master/src/main/java/net/tradelib/ratio/SortinoRatio.java
- https://github.com/dcajasn/Riskfolio-Lib/blob/master/riskfolio/RiskFunctions.py
- https://github.com/lequant40/portfolio_analytics_js
- https://analyzingalpha.com/profit-factor#:~:text=The%20profit%20factor%20is%20the,above%203.0%20is%20considered%20outstanding.
