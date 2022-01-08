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

## TODO

- Handle missing data file (Option<Tick[]>?)
- Create sample strategy to fill out positions API
- Log results to DB
- Results viewer
