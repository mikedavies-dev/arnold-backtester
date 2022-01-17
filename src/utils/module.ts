import {BrokerState, OrderSpecification} from '../backtest/broker';
import {LoggerCallback, Tick} from '../core';
import {Tracker} from '../utils/tracker';

type InitStrategy = () => void;
type ExtraSymbols = Array<string>;

export type HandleTickParameters = {
  log: LoggerCallback;
  tick: Tick;
  symbol: string;
  tracker: Tracker;
  trackers: Record<string, Tracker>;
  broker: {
    state: BrokerState;
    placeOrder: (spec: OrderSpecification) => number;
    hasOpenOrders: (symbol: string) => boolean;
  };
};

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
