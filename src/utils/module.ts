import {HandleTickParameters, IsSetupParameters} from '../core';

type InitStrategy = () => void;
type ExtraSymbols = Array<string>;

export type HandleTick = (args: HandleTickParameters) => void;
export type IsSetup = (args: IsSetupParameters) => boolean;

export async function loadStrategy(path: string) {
  try {
    const {
      init,
      extraSymbols,
      handleTick,
      isSetup,
    }: {
      init: InitStrategy;
      extraSymbols: ExtraSymbols;
      handleTick: HandleTick;
      isSetup: IsSetup;
    } = await import(path);

    return {
      init,
      extraSymbols,
      handleTick,
      isSetup,
    };
  } catch (err) {
    return null;
  }
}
