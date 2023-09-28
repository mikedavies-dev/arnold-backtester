import axios from 'axios';
import {
  addSeconds,
  endOfDay,
  format,
  getUnixTime,
  max,
  startOfDay,
  subDays,
} from 'date-fns';
import {z} from 'zod';
import axiosRetry from 'axios-retry';

import {
  Bar,
  DataProvider,
  DownloadTickDataArgs,
  Instrument,
  LoggerCallback,
  StoredTick,
  TickFileType,
  TimeSeriesPeriod,
} from '../../../core';

import Env from '../../../utils/env';
import {formatDateTime} from '../../dates';
import numeral from 'numeral';

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
      results: z
        .array(
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
        )
        .optional(),
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
        `v2/aggs/ticker/${instrument.externalId}/range/${multiplier[period]}/${timespan[period]}/${from}/${to}`,
        {
          params: {
            limit: 50000,
            adjusted: 'true',
            sort: 'asc',
          },
        },
      );

      const {results} = Response.parse(data);

      if (!results) {
        return [];
      }

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
            primary_exchange: z.string().optional(),
            type: z.string().optional(),
            active: z.boolean(),
            currency_name: z.string(),
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
        if (result.market === 'fx') {
          return {
            symbol: result.ticker.substring(2),
            name: result.name,
            externalId: `${result.ticker}`,
            data: result,
          };
        }
        return {
          symbol: result.ticker,
          name: result.name,
          externalId: `${result.ticker}`,
          data: result,
        };
      });
    } catch {
      return [];
    }
  }

  async function downloadTradeData({
    instrument,
    date,
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

    const from = startOfDay(date).getTime();
    const to = endOfDay(date).getTime();

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
      | undefined = `/v3/trades/${instrument.externalId}?timestamp.gte=${from}000000&timestamp.lt=${to}000000&limit=5000`;

    while (url) {
      url = await request(url);
    }

    merge();
  }

  async function downloadBidAskData({
    instrument,
    date,
    write,
    merge,
  }: DownloadTickDataArgs) {
    const Response = z.object({
      next_url: z.string().optional(),
      request_id: z.string(),
      results: z.array(
        z.object({
          ask_exchange: z.number(),
          ask_price: z.number(),
          bid_exchange: z.number(),
          bid_price: z.number(),
          participant_timestamp: z.number(),
        }),
      ),
      status: z.string(),
    });

    const from = startOfDay(date).getTime();
    const to = endOfDay(date).getTime();

    const request = async (url: string) => {
      const {data} = await instance.get(url);

      const {results, next_url: next} = Response.parse(data);

      log?.(
        `Downloaded ${results.length} bid/ask quotes for ${
          instrument.symbol
        } for ${format(from, 'yyyy-MM-dd HH:mm:ss')}`,
      );

      const ticks = results
        .map(trade => {
          const timestamp = Math.ceil(trade.participant_timestamp / 1000000);
          const time = new Date(timestamp);

          return [
            {
              time: time.getTime() / 1000,
              dateTime: time,
              symbol: instrument.symbol,
              type: 'BID',
              size: 1,
              value: trade.bid_price,
              index: 0,
            },
            {
              time: time.getTime() / 1000,
              dateTime: time,
              symbol: instrument.symbol,
              type: 'ASK',
              size: 1,
              value: trade.ask_price,
              index: 0,
            },
            // TODO we should only do this if forex and we don't have trade history
            {
              time: time.getTime() / 1000,
              dateTime: time,
              symbol: instrument.symbol,
              type: 'TRADE',
              size: 1,
              // average
              value: +((trade.ask_price + trade.bid_price) / 2).toFixed(6),
              index: 0,
            },
          ] as StoredTick[];
        })
        .flat();

      // write the data
      await write(TickFileType.BidAsk, ticks);

      return next;
    };

    let url:
      | string
      | undefined = `/v3/quotes/${instrument.externalId}?timestamp.gte=${from}000000&timestamp.lt=${to}000000&limit=5000`;

    while (url) {
      url = await request(url);
    }

    merge();
  }

  async function downloadTickData({
    instrument,
    date,
    write,
    merge,
  }: DownloadTickDataArgs) {
    await downloadTradeData({instrument, date, write, merge});
    await downloadBidAskData({instrument, date, write, merge});
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
