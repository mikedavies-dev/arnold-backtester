import axios from 'axios';

import {Position, Profile} from '../core';
import {ResultsMetrics} from '../utils/results-metrics';
import {deepParseDates} from '../utils/data-structures';

const instance = axios.create({
  baseURL: '/api',
});

instance.interceptors.response.use(originalResponse => {
  deepParseDates(originalResponse.data);
  return originalResponse;
});

export type RawBacktestResultSummary = {
  id: string;
  createdAt: string;
  symbols: Array<string>;
  strategy: string;
};

export type BacktestResultSummary = {
  id: string;
  createdAt: Date;
  symbols: Array<string>;
  strategy: string;
  positions: number;
};

export type RawBacktestResultDetails = {
  id: string;
  createdAt: string;
  profile: Profile;
  metrics: ResultsMetrics;
  positions: Array<Position>;
};

export type BacktestResultDetails = {
  id: string;
  createdAt: Date;
  profile: Profile;
  positions: Array<Position>;
  metrics: ResultsMetrics;
};

export async function listBacktests(): Promise<Array<BacktestResultSummary>> {
  const {data}: {data: Array<BacktestResultSummary>} = await instance.get(
    'backtests',
  );

  return data;
}

export async function listBacktest(id: string): Promise<BacktestResultDetails> {
  const {data}: {data: BacktestResultDetails} = await instance.get(
    `backtest/${id}`,
  );

  return data;
}
