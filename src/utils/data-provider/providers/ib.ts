import {TimeSeriesPeriod, DataProvider, Instrument, Bar} from '../../../core';

export function create(): DataProvider {
  async function init() {}

  async function getTimeSeries(
    symbol: string,
    from: Date,
    to: Date,
    period: TimeSeriesPeriod,
  ): Promise<Bar[]> {
    return [];
  }

  async function instrumentLookup(symbol: string): Promise<Instrument[]> {
    return [];
  }

  return {
    name: 'ib',
    init,
    getTimeSeries,
    instrumentLookup,
  };
}
