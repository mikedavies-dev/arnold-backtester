import {
  Bar,
  DataProvider,
  DownloadTickDataArgs,
  Instrument,
  LoggerCallback,
  TimeSeriesPeriod,
} from '../../../core';

import Env from '../../../utils/env';

import axios from 'axios';
function getApiUrl(endpoint: string, params: Record<string, string>) {
  const query = new URLSearchParams({
    ...params,
    apiKey: Env.POLYGONIO_KEY,
  });

  const url = new URL(
    `${endpoint}?${query.toString()}`,
    'https://api.polygon.io/v3/',
  );

  return url.toString();
}

const instance = axios.create({
  baseURL: 'https://api.polygon.io/v3/',
  timeout: 60000,
  headers: {Authorization: `Bearer ${Env.POLYGONIO_KEY}`},
});

export function create({log}: {log?: LoggerCallback} = {}): DataProvider {
  async function getTimeSeries(
    instrument: Instrument,
    end: Date,
    days: number,
    period: TimeSeriesPeriod,
  ): Promise<Bar[]> {
    return [];
  }

  async function instrumentLookup(searchTerm: string): Promise<Instrument[]> {
    const res = instance.get('reference/tickers', {
      params: {
        symbol: searchTerm,
        active: 'true',
      },
    });

    console.log('XXX', res);

    return [];
  }

  async function downloadTickData({
    instrument,
    minute,
    write,
    merge,
  }: DownloadTickDataArgs) {}

  function subscribeMarketUpdates() {
    return 0;
  }

  function cancelMarketUpdates() {}

  return {
    name: 'polygonio',
    init: async () => {},
    shutdown: async () => {},
    getTimeSeries,
    instrumentLookup,
    downloadTickData,
    subscribeMarketUpdates,
    cancelMarketUpdates,
    select: () => {},
  };
}
