import axios from 'axios';
import {parseISO} from 'date-fns';
import {Profile} from '../utils/profile';
import {Position} from '../backtest/broker';
import {ResultsMetrics} from '../utils/results-metrics';

const instance = axios.create({
  baseURL: '/api',
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
  const {data}: {data: Array<RawBacktestResultSummary>} = await instance.get(
    'backtests',
  );

  return data.map(result => {
    return {
      ...result,
      createdAt: parseISO(result.createdAt),
    };
  }) as Array<BacktestResultSummary>;
}

export async function listBacktest(id: string): Promise<BacktestResultDetails> {
  const {data}: {data: RawBacktestResultDetails} = await instance.get(
    `backtest/${id}`,
  );

  return {
    ...data,
    createdAt: parseISO(data.createdAt),
  };
}
