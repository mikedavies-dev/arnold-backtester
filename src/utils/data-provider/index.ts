import {BrokerProvider, DataProvider, LoggerCallback} from '../../core';

import Env from '../env';

import {create as createIBDataProvider} from './providers/ib';
import {create as createIBBrokerProvider} from './brokers/ib';

export function createDataProvider({
  log,
}: {log?: LoggerCallback} = {}): DataProvider {
  switch (Env.DATA_PROVIDER) {
    case 'ib':
      return createIBDataProvider({log});

    default:
      throw new Error(`Unknown data provider ${Env.DATA_PROVIDER}`);
  }
}

export function createBroker({
  log,
}: {log?: LoggerCallback} = {}): BrokerProvider {
  switch (Env.BROKER_PROVIDER) {
    case 'ib':
      return createIBBrokerProvider({log});

    default:
      throw new Error(`Unknown data provider ${Env.BROKER_PROVIDER}`);
  }
}
