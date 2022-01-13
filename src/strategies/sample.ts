import {OnTickParameters} from '../utils/module';

export const extraSymbols = ['SPY'];

export function init() {}

export function onTick({tick, symbol, log}: OnTickParameters) {
  log(symbol, tick);
}
