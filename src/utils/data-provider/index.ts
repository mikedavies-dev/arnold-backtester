import {DataProvider} from '../../core';

import Env from '../env';

import {create as createIB} from './providers/ib';

export function createDataProvider(): DataProvider {
  switch (Env.DATA_PROVIDER) {
    case 'ib':
      return createIB();

    default:
      throw new Error(`Unknown data provider ${Env.DATA_PROVIDER}`);
  }
}
