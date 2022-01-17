import {HandleTickParameters} from '../utils/module';

export const extraSymbols = ['SPY'];

export function init() {}

export function handleTick({tick, symbol, log}: HandleTickParameters) {
  log(symbol, tick);
}
