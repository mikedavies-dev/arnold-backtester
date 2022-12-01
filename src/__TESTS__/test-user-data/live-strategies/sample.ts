/*
Sample Live Strategy
*/

import {HandleTickParameters, IsSetupParameters} from '../../../core';

export const extraSymbols = ['SPY'];

export function init() {}

export function isSetup({
  // symbol,
  // tracker,
  // log,
  marketTime,
  marketOpen,
}: IsSetupParameters) {
  // We are in a setup once the market is open
  return marketTime > marketOpen;
}

export function handleTick({tick, symbol, log}: HandleTickParameters) {
  log(symbol, tick);
}
