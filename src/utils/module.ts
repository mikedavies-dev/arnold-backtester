import {HandleTickParameters, IsInPlayParameters} from '../core';

type InitStrategy = () => void;
type ExtraSymbols = Array<string>;

export type HandleTick = (args: HandleTickParameters) => void;
export type IsInPlay = (args: IsInPlayParameters) => boolean;

export async function loadStrategy(path: string) {
  try {
    const {
      init,
      extraSymbols,
      handleTick,
      IsInPlay,
    }: {
      init: InitStrategy;
      extraSymbols: ExtraSymbols;
      handleTick: HandleTick;
      IsInPlay: IsInPlay;
    } = await import(path);

    return {
      init,
      extraSymbols,
      handleTick,
      IsInPlay,
    };
  } catch (err) {
    return null;
  }
}
