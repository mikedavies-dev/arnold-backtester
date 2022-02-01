import axios from 'axios';
import {parseISO} from 'date-fns';

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
