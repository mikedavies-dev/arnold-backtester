import {HandleTickParameters} from '../core';

type InitStrategy = () => void;
type ExtraSymbols = Array<string>;

export type HandleTick = (args: HandleTickParameters) => void;

export async function loadStrategy(path: string) {
  try {
    const {
      init,
      extraSymbols,
      handleTick,
    }: {
      init: InitStrategy;
      extraSymbols: ExtraSymbols;
      handleTick: HandleTick;
    } = await import(path);

    return {
      init,
      extraSymbols,
      handleTick,
    };
  } catch (err) {
    return null;
  }
}
