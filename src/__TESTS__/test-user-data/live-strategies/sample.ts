/*
Sample Live Strategy
*/

import {Strategy, StrategyParameters, Tick} from '../../../core';

export const extraSymbols = ['SPY'];

export default function ({
  symbol,
  log,
  // tracker,
  // trackers,
  market,
}: // broker,
StrategyParameters): Strategy {
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
