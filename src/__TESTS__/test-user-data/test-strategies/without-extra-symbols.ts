/*
Sample Backtest Strategy
*/

import {Strategy, StrategySetupParameters, Tick} from '../../../core';

export default function ({
  symbol,
  log,
  market,
}: StrategySetupParameters): Strategy {
  function init() {}

  function isSetup(): boolean {
    return market.time.unix > market.open.unix;
  }

  function handleTick(tick: Tick) {
    log(symbol, tick);
  }

  return {
    init,
    isSetup,
    handleTick,
    indicators: [],
  };
}
