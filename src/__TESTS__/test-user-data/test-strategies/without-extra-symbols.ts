/*
Sample Backtest Strategy
*/

import {Strategy, StrategyParameters, Tick} from '../../../core';

export default function ({symbol, log, market}: StrategyParameters): Strategy {
  function isSetup(): boolean {
    return market.current.unix > market.open.unix;
  }

  function handleTick(tick: Tick) {
    log(symbol, tick);
  }

  return {
    isSetup,
    handleTick,
    indicators: [],
  };
}
