import {TimeSeriesPeriod} from '../../core';
import {Bar} from '../tracker';
import Env from '../env';

import {create as createIB} from './providers/ib';

export type DataProvider = {
  init(): Promise<void>;
  getTimeSeries(
    symbol: string,
    from: Date,
    to: Date,
    period: TimeSeriesPeriod,
  ): Promise<Array<Bar>>;
};

export function createDataProvider(): DataProvider {
  switch (Env.DATA_PROVIDER) {
    case 'ib':
      return createIB();

    default:
      throw new Error(`Unknown data provider ${Env.DATA_PROVIDER}`);
  }
}
