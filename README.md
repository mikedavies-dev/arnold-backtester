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
  "dates": {
    "from": "2021-12-01",
    "to": "2021-12-03"
  },
  "symbols": ["MSFT"]
}
```

## Sample Strategy

todo

## TODO

- Cleanup project layout
- Create basic express server
- Results viewer

# Ideal folder setup

- src/
  - bin/
  - backtest/
  - trader/
  - server/
    - public/
  - core/
