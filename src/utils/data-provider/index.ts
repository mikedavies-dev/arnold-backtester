import {DataProvider, LoggerCallback} from '../../core';

import Env from '../env';

import {create as createIB} from './providers/ib';

export function createDataProvider({
  log,
}: {log?: LoggerCallback} = {}): DataProvider {
  switch (Env.DATA_PROVIDER) {
    case 'ib':
      return createIB({log});

    default:
      throw new Error(`Unknown data provider ${Env.DATA_PROVIDER}`);
  }
}
