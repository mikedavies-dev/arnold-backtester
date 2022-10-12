import {IBApiNext, ConnectionState, Contract, BarSizeSetting} from '@stoqey/ib';
import series from 'promise-series2';
import {
  format,
  parse,
  isSameDay,
  isSameSecond,
  addSeconds,
  addMinutes,
} from 'date-fns';
import {lastValueFrom} from 'rxjs';
import numeral from 'numeral';

import {acquireLock} from '../../lock';

const barSizeLookup: Record<TimeSeriesPeriod, BarSizeSetting> = {
  m1: BarSizeSetting.MINUTES_ONE,
  m5: BarSizeSetting.MINUTES_FIVE,
  m60: BarSizeSetting.HOURS_ONE,
  daily: BarSizeSetting.DAYS_ONE,
};

const barSizeParseLookup: Record<TimeSeriesPeriod, string> = {
  m1: 'yyyyMMdd  HH:mm:ss',
  m5: 'yyyyMMdd  HH:mm:ss',
  m60: 'yyyyMMdd  HH:mm:ss',
  daily: 'yyyyMMdd',
};

import {
  TimeSeriesPeriod,
  DataProvider,
  Instrument,
  Bar,
  Tick,
  DownloadTickDataArgs,
  notEmpty,
  TickFileType,
  LoggerCallback,
} from '../../../core';

import Env from '../../../utils/env';
import {formatDateTime} from '../../dates';

let currentApiClientId = Number(Env.IB_BASE_CLIENT_ID);

export function formatIbRequestDate(date: Date) {
  return format(date, 'yyyyMMdd HH:mm:ss');
}

async function downloadBidAskTickData(
  api: IBApiNext,
  instrument: Instrument,
  lastDataDate: Date,
): Promise<Tick[]> {
  const contract: Contract = instrument.data as Contract;

  /*
  {
    time: 1649683799,
    tickAttribBidAsk: { bidPastLow: false, askPastHigh: false },
    priceBid: 291.51,
    priceAsk: 291.95,
    sizeBid: 200,
    sizeAsk: 100
  }
  */

  const ibTicks = await lastValueFrom(
    api.getHistoricalTicksBidAsk(
      contract,
      formatIbRequestDate(lastDataDate),
      '',
      1000,
      1,
      false,
    ),
  );

  const ticks: Tick[] = ibTicks
    .map<Tick[]>(tick => {
      if (
        !tick.time ||
        !tick.priceAsk ||
        !tick.priceBid ||
        !tick.sizeAsk ||
        !tick.priceBid ||
        !tick.sizeBid
      ) {
        return [];
      }
      return [
        {
          time: tick.time,
          index: 0,
          dateTime: new Date(tick.time * 1000),
          symbol: instrument.symbol,
          type: 'BID',
          size: tick.priceBid,
          value: tick.sizeBid,
        },
        {
          time: tick.time,
          index: 0,
          dateTime: new Date(tick.time * 1000),
          symbol: instrument.symbol,
          type: 'ASK',
          size: tick.priceAsk,
          value: tick.sizeAsk,
        },
      ];
    })
    .flat()
    .filter(tick => isSameDay(lastDataDate, new Date(tick.time * 1000)));

  return ticks;
}

async function downloadTradeTickData(
  api: IBApiNext,
  instrument: Instrument,
  lastDataDate: Date,
): Promise<Tick[]> {
  const contract: Contract = instrument.data as Contract;

  /*
  {
    time: 1649683800,
    tickAttribBidAsk: { pastLimit: false, unreported: true },
    price: 291.62,
    size: 40,
    exchange: 'BYX',
    specialConditions: '   I'
  }
  */

  const ibTicks = await lastValueFrom(
    api.getHistoricalTicksLast(
      contract,
      formatIbRequestDate(lastDataDate),
      '',
      1000,
      1,
    ),
  );

  const ticks: Tick[] = ibTicks
    .map<Tick | null>(tick => {
      if (!tick.time || !tick.price || !tick.size) {
        return null;
      }
      return {
        time: tick.time,
        index: 0,
        dateTime: new Date(tick.time * 1000),
        symbol: instrument.symbol,
        type: 'TRADE',
        size: tick.size,
        value: tick.price,
      };
    })
    // TODO, this isn't very efficient but TS throws an error if we don't use
    // notEmpty in it's own filter..
    .filter(notEmpty)
    .filter(tick => isSameDay(lastDataDate, new Date(tick.time * 1000)));

  return ticks;
}

type DownloadTickDataFn = typeof downloadBidAskTickData;

export function create({log}: {log?: LoggerCallback} = {}): DataProvider {
  const api = new IBApiNext({
    reconnectInterval: 10000,
    host: Env.IB_HOST,
    port: Number(Env.IB_PORT),
  });

  api.errorSubject.subscribe(err => {
    log?.(`Error: ${err.error.message} (${err.code})`);
  });

  async function init({workerIndex}: {workerIndex?: number} = {}) {
    return new Promise<void>((resolve, reject) => {
      // Set a timeout
      const timeoutTimer = setTimeout(async () => {
        log?.('Disconnecting because of timeout');
        await api.disconnect();
        reject(new Error('Timeout connecting to IB'));
      }, 10000);

      api.connectionState.subscribe(async state => {
        // log?.('State Changed', state, api.isConnected);
        if (state === ConnectionState.Connected) {
          // Set the logging level
          // api.logLevel = LogLevel.INFO;
          log?.('Connected to IB');
          clearTimeout(timeoutTimer);

          // Wait a while to let IB sort it out
          setTimeout(resolve, 200);
        }
      });

      /*
      Related to lock.ts, we're creating a new IB connection for each worker which isn't ideal
      ideally we should have one connection on the main worker and send download messages there
      so we don't risk:

      1. Hitting rate limits in IB
      2. Having multiple connections to IB
      */
      const offset = (workerIndex || 0) + 1;
      const clientId = offset * 10 + currentApiClientId;

      api.connect(clientId);

      // Increment the id
      currentApiClientId += 1;
    });
  }

  async function shutdown() {
    log?.('Shutting down');
    return new Promise<void>(resolve => {
      api.connectionState.subscribe(state => {
        if (state === ConnectionState.Disconnected) {
          resolve();
        }
      });

      api.disconnect();
    });
  }

  async function getTimeSeries(
    instrument: Instrument,
    end: Date,
    days: number,
    period: TimeSeriesPeriod,
  ): Promise<Bar[]> {
    const contract: Contract = instrument.data as Contract;

    const bars = await api.getHistoricalData(
      contract,
      formatIbRequestDate(end),
      `${days} D`,
      barSizeLookup[period],
      'TRADES',
      0,
      1,
    );

    return bars.map(bar => {
      const parseFormat = barSizeParseLookup[period];
      const time = parse(bar.time || '', parseFormat, new Date());
      return {
        time: format(time, 'yyyy-MM-dd HH:mm:ss'),
        open: bar.open || 0,
        high: bar.high || 0,
        low: bar.low || 0,
        close: bar.close || 0,
        volume: bar.volume || 0,
      };
    });
  }

  async function instrumentLookup(searchTerm: string): Promise<Instrument[]> {
    const contracts = await api.searchContracts(searchTerm);

    const details = await series(
      async contract => {
        const res = await api.getContractDetails(contract.contract as Contract);
        return res[0];
      },
      1,
      // IB returns some -1 contracts which we don't want
      contracts.filter(c => c.contract?.conId && c.contract?.conId !== -1),
    );

    return details.map(contract => ({
      externalId: String(contract.contract.conId),
      symbol: String(contract.contract.symbol),
      name: `${String(contract.longName)} (${contract.contract.symbol}/${
        contract.contract.secType
      }/${contract.contract.exchange}/${contract.contract.currency})`,
      data: contract.contract,
    }));
  }

  async function downloadTickData({
    instrument,
    minute,
    write,
    merge,
  }: DownloadTickDataArgs) {
    // Don't like this, we could have multiple threads all trying to get the lock at the same time
    // We really need an organized way of handling IB requests from the main worker but this should
    // work for now

    const releaseLock = await acquireLock({
      name: 'arnold-ib',
      timeout: Number(Env.IB_LOCK_TIMEOUT),
    });

    try {
      log?.(
        `Downloading tick data for ${instrument.symbol} @ ${formatDateTime(
          minute,
        )}`,
      );

      const downloadAndWriteData = async (
        type: TickFileType,
        downloadDataFn: DownloadTickDataFn,
      ) => {
        let currentTime = minute;
        const until = addMinutes(minute, 1);

        do {
          // get ticks for this minute
          const ticks = (
            await downloadDataFn(api, instrument, currentTime)
          ).filter(tick => tick.dateTime < until);

          if (!ticks.length || currentTime >= until) {
            log?.(
              `Finished downloading ${type} ticks for ${
                instrument.symbol
              } for ${formatDateTime(minute)}`,
            );
            break;
          }

          log?.(
            `Downloaded ${numeral(ticks.length).format(
              '0,0',
            )} ${type} ticks for ${instrument.symbol} from ${formatDateTime(
              currentTime,
            )}`,
          );

          await write(type, ticks);

          // If the last tick is the same as our previous from, add a second
          // This could mean that we have more than 1000 ticks in any one second

          const nextDate = ticks[ticks.length - 1].dateTime;

          currentTime = isSameSecond(currentTime, nextDate)
            ? addSeconds(nextDate, 1)
            : nextDate;
        } while (true); // eslint-disable-line
      };

      // Download bid/ask data
      await downloadAndWriteData(TickFileType.BidAsk, downloadBidAskTickData);

      // Download trade data
      await downloadAndWriteData(TickFileType.Trades, downloadTradeTickData);

      log?.(
        `Merging tick data for ${instrument.symbol} for ${formatDateTime(
          minute,
        )}`,
      );
      await merge();
    } finally {
      // Release the lock to allow other processes to download data
      await releaseLock();
    }
  }

  return {
    name: 'ib',
    init,
    shutdown,
    getTimeSeries,
    instrumentLookup,
    downloadTickData,
  };
}
