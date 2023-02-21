import {
  BrokerProvider,
  DataProvider,
  LoggerCallback,
  PositionProvider,
} from '../../core';

import Env from '../env';

import {create as createIBDataProvider} from './providers/ib';
import {create as createIBBrokerProvider} from './brokers/ib';

import {create as createPolygonDataProvider} from './providers/polygonio';

export function createDataProvider({
  log,
  type,
}: {
  log?: LoggerCallback;
  type: 'backtest' | 'trader';
}): DataProvider {
  const provider =
    type === 'backtest' ? Env.DATA_PROVIDER_BACKTEST : Env.DATA_PROVIDER_TRADER;
  switch (provider) {
    case 'ib':
      return createIBDataProvider({log});

    case 'polygonio':
      return createPolygonDataProvider({log});

    default:
      throw new Error(`Unknown data provider ${provider}`);
  }
}

export function createBroker({
  log,
  positions,
}: {
  log?: LoggerCallback;
  positions: PositionProvider;
}): BrokerProvider {
  switch (Env.BROKER_PROVIDER) {
    case 'ib':
      return createIBBrokerProvider({log, positions});

    default:
      throw new Error(`Unknown data provider ${Env.BROKER_PROVIDER}`);
  }
}
