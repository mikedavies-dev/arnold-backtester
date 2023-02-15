import axios from 'axios';
import {addMinutes, format, getUnixTime, subDays} from 'date-fns';
import {z} from 'zod';
import axiosRetry from 'axios-retry';

import {
  Bar,
  DataProvider,
  DownloadTickDataArgs,
  Instrument,
  LoggerCallback,
  TickFileType,
  TimeSeriesPeriod,
} from '../../../core';

import Env from '../../../utils/env';

const instance = axios.create({
  baseURL: 'https://api.polygon.io/',
  timeout: 60000,
  headers: {Authorization: `Bearer ${Env.POLYGONIO_KEY}`},
});

// retry the connection 3 times to avoid dns issues
axiosRetry(instance, {
  retries: 3,
});

export function create({log}: {log?: LoggerCallback} = {}): DataProvider {
  async function getTimeSeries(
    instrument: Instrument,
    end: Date,
    days: number,
    period: TimeSeriesPeriod,
  ): Promise<Bar[]> {
    const Response = z.object({
      ticker: z.string(),
      queryCount: z.number(),
      resultsCount: z.number(),
      adjusted: z.boolean(),
      results: z.array(
        z.object({
          v: z.number(),
          vw: z.number(),
          o: z.number(),
          c: z.number(),
          h: z.number(),
          l: z.number(),
          t: z.number(),
          n: z.number(),
        }),
      ),
    });

    try {
      const to = getUnixTime(end) * 1000;
      const from = getUnixTime(subDays(end, days)) * 1000;

      const timespan: Record<TimeSeriesPeriod, 'day' | 'minute' | 'hour'> = {
        m1: 'minute',
        m5: 'minute',
        m60: 'hour',
        daily: 'day',
      };

      const multiplier: Record<TimeSeriesPeriod, number> = {
        m1: 1,
        m5: 5,
        m60: 1,
        daily: 1,
      };

      const {data} = await instance.get(
        `v2/aggs/ticker/${instrument.symbol}/range/${multiplier[period]}/${timespan[period]}/${from}/${to}`,
        {
          params: {
            limit: 50000,
            adjusted: 'true',
            sort: 'asc',
          },
        },
      );

      const {results} = Response.parse(data);

      return results.map(result => {
        const time = new Date(result.t);
        return {
          time: format(time, 'yyyy-MM-dd HH:mm:ss'),
          open: result.o,
          high: result.h,
          low: result.l,
          close: result.c,
          volume: result.v,
        };
      });
    } catch {
      return [];
    }
  }

  async function instrumentLookup(searchTerm: string): Promise<Instrument[]> {
    try {
      const Response = z.object({
        status: z.string(),
        request_id: z.string(),
        count: z.number(),
        results: z.array(
          z.object({
            ticker: z.string(),
            name: z.string(),
            market: z.enum(['stocks', 'crypto', 'fx', 'oct']),
            locale: z.enum(['us', 'global']),
            primary_exchange: z.string(),
            type: z.string(),
            active: z.boolean(),
            currency_name: z.string(),
            cik: z.string(),
            composite_figi: z.string(),
            share_class_figi: z.string(),
            last_updated_utc: z.coerce.date(),
          }),
        ),
      });

      const {data} = await instance.get('v3/reference/tickers', {
        params: {
          ticker: searchTerm,
          active: 'true',
        },
      });

      const {results} = Response.parse(data);

      return results.map(result => {
        return {
          symbol: result.ticker,
          name: result.name,
          externalId: `${result.ticker}@${result.primary_exchange}`,
          data: result,
        };
      });
    } catch {
      return [];
    }
  }

  async function downloadTickData({
    instrument,
    minute,
    write,
    merge,
  }: DownloadTickDataArgs) {
    const Response = z.object({
      next_url: z.string().optional(),
      request_id: z.string(),
      results: z.array(
        z.object({
          conditions: z.array(z.number()).optional(),
          exchange: z.number(),
          id: z.string(),
          participant_timestamp: z.number(),
          price: z.number(),
          sequence_number: z.number(),
          sip_timestamp: z.number(),
          size: z.number(),
          tape: z.number(),
        }),
      ),
      status: z.string(),
    });

    const from = minute.getTime();
    const to = addMinutes(minute, 1).getTime();

    const request = async (url: string) => {
      const {data} = await instance.get(url);

      const {results, next_url: next} = Response.parse(data);

      log?.(
        `Downloaded ${results.length} ticks for ${
          instrument.symbol
        } for ${format(from, 'yyyy-MM-dd HH:mm:ss')}`,
      );

      // write the data
      await write(
        TickFileType.Trades,
        results.map(trade => {
          const timestamp = Math.ceil(trade.sip_timestamp / 1000000);
          const time = new Date(timestamp);

          return {
            time: time.getTime() / 1000,
            dateTime: time,
            symbol: instrument.symbol,
            type: 'TRADE',
            size: trade.size,
            value: trade.price,
            index: 0,
          };
        }),
      );

      return next;
    };

    let url:
      | string
      | undefined = `/v3/trades/${instrument.symbol}?timestamp.gte=${from}000000&timestamp.lt=${to}000000&limit=5000`;

    while (url) {
      url = await request(url);
    }

    merge();
  }

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
