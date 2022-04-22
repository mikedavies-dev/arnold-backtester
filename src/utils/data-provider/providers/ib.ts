import {
  IBApiNext,
  LogLevel,
  ConnectionState,
  Contract,
  BarSizeSetting,
} from '@stoqey/ib';
import series from 'promise-series2';
import {format, parse} from 'date-fns';

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
} from '../../../core';
import Logger from '../../../utils/logger';
import Env from '../../../utils/env';

const log = Logger('ib');

export function formatIbRequestDate(date: Date) {
  return format(date, 'yyyyMMdd HH:mm:ss');
}

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

    const ibBars = await api.getHistoricalData(
      contract,
      formatIbRequestDate(end),
      `${days} D`,
      barSizeLookup[period],
      'TRADES',
      0,
      1,
    );

    return ibBars.map(bar => {
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

  async function downloadTickData(
    instrument: Instrument,
    date: Date,
    outputFilename: string,
  ) {
    return;
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
