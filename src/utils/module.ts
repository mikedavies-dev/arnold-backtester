import {
  HandleTickParameters,
  IsSetupParameters,
  StrategySetupParameters,
  Strategy,
} from '../core';

export type HandleTick = (args: HandleTickParameters) => void;
export type IsSetup = (args: IsSetupParameters) => boolean;

export async function loadStrategy(path: string) {
  try {
    const strategy = await import(path);

    const factory = strategy.default as (
      params: StrategySetupParameters,
    ) => Strategy;

    return {
      factory,
      extraSymbols: (strategy.extraSymbols as string[]) || [],
    };
  } catch (err) {
    return null;
  }
}
