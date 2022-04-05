import {DataProvider} from '../index';
import {TimeSeriesPeriod} from '../../../core';
import {Bar} from '../../tracker';

export function create(): DataProvider {
  async function init() {}

  async function getTimeSeries(
    symbol: string,
    date: Date,
    period: TimeSeriesPeriod,
  ): Promise<Array<Bar>> {
    return [];
  }

  return {
    init,
    getTimeSeries,
  };
}
