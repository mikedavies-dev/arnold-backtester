/*
Sample Backtest Strategy
*/

import {Strategy, StrategyParameters, Tick} from '../../../core';

export const extraSymbols = ['SPY'];

export default function ({symbol, log, market}: StrategyParameters): Strategy {
  const isSetup = () => {
    return market.time.unix > market.open.unix;
  };

  const handleTick = (tick: Tick) => {
    log(symbol, tick);
  };

  return {
    isSetup,
    handleTick,
    indicators: [],
  };
}
