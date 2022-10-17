/*
Sample Backtest Strategy
*/

import {HandleTickParameters} from '../../../core';

export const extraSymbols = ['SPY'];

export function init() {}

export function handleTick({tick, symbol, log}: HandleTickParameters) {
  log(symbol, tick);
}
