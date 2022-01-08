# Arnold 💪 - Stock/Crypto Backtesting Platform

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
  "startingBalance": 10000,
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

- Handle missing data file (`Option<Tick[]>?`)
- Handle missing profile (`Option<Profile>?`)
- Create sample strategy to fill out positions API
- Log results to DB
- Results viewer
