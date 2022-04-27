import {
  IBApiNext,
  LogLevel,
  ConnectionState,
  Contract,
  BarSizeSetting,
} from '@stoqey/ib';
import series from 'promise-series2';
import {format, parse, isSameDay, isSameSecond, addSeconds} from 'date-fns';
import {lastValueFrom} from 'rxjs';
import numeral from 'numeral';

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
} from '../../../core';
import Logger from '../../../utils/logger';
import Env from '../../../utils/env';
import {formatDate, formatDateTime} from '../../dates';

const log = Logger('interactive brokers');

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

export function create(): DataProvider {
  const api = new IBApiNext({
    reconnectInterval: 10000,
    host: Env.IB_HOST,
    port: Number(Env.IB_PORT),
  });

  api.errorSubject.subscribe(err => {
    log(`Error: ${err.error.message} (${err.code})`);
  });

  async function init() {
    return new Promise<void>((resolve, reject) => {
      api.logLevel = LogLevel.INFO;

      // Set a timeout
      const timeoutTimer = setTimeout(async () => {
        await api.disconnect();
        reject(new Error('Timeout connecting to IB'));
      }, 10000);

      api.connectionState.subscribe(async state => {
        if (state === ConnectionState.Connected) {
          clearTimeout(timeoutTimer);
          resolve();
        }
      });

      api.connect(Number(Env.IB_CLIENT_ID_DATA_PROVIDER));
    });
  }

  async function shutdown() {
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
      contracts,
    );

    return details.map(contract => ({
      id: contract.contract.conId,
      symbol: String(contract.contract.symbol),
      name: `${String(contract.longName)} (${contract.contract.symbol}/${
        contract.contract.secType
      }/${contract.contract.exchange}/${contract.contract.currency})`,
      data: contract.contract,
    }));
  }

  async function downloadTickData({
    instrument,
    date,
    write,
    merge,
    latestDataDates,
  }: DownloadTickDataArgs) {
    log(`Downloading tick data for ${instrument.symbol} @ ${formatDate(date)}`);

    const downloadAndWriteData = async (
      type: TickFileType,
      downloadDataFn: DownloadTickDataFn,
      from: Date,
    ) => {
      let currentDate = from;

      do {
        const ticks = await downloadDataFn(api, instrument, currentDate);

        if (!ticks.length) {
          log(
            `Finished downloading ${type} ticks for ${
              instrument.symbol
            } for ${formatDate(currentDate)}`,
          );
          break;
        }

        log(
          `Downloaded ${numeral(ticks.length).format(
            '0,0',
          )} ${type} ticks for ${instrument.symbol} from ${formatDateTime(
            currentDate,
          )}`,
        );

        await write(type, ticks);

        // If the last tick is the same as our previous from, add a second
        // This could mean that we have more than 1000 ticks in any one second

        const nextDate = ticks[ticks.length - 1].dateTime;

        currentDate = isSameSecond(currentDate, nextDate)
          ? addSeconds(nextDate, 1)
          : nextDate;
      } while (true); // eslint-disable-line
    };

    await downloadAndWriteData(
      TickFileType.BidAsk,
      downloadBidAskTickData,
      latestDataDates.bidask || date,
    );

    await downloadAndWriteData(
      TickFileType.Trades,
      downloadTradeTickData,
      latestDataDates.trades || date,
    );

    log(`Merging tick data for ${instrument.symbol} for ${formatDate(date)}`);
    await merge();
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
