import {LoggerCallback, Tick} from '../core';
import {Tracker} from '../utils/tracker';

type InitStrategy = () => void;
type ExtraSymbols = Array<string>;

export type OnTickParameters = {
  log: LoggerCallback;
  tick: Tick;
  symbol: string;
  tracker: Tracker;
  trackers: Record<string, Tracker>;
};

export type OnTick = (args: OnTickParameters) => void;

export async function loadStrategy(path: string) {
  try {
    const {
      init,
      extraSymbols,
      onTick,
    }: {
      init: InitStrategy;
      extraSymbols: ExtraSymbols;
      onTick: OnTick;
    } = await import(path);

    return {
      init,
      extraSymbols,
      onTick,
    };
  } catch (err) {
    return null;
  }
}
