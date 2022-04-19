import {
  IBApiNext,
  LogLevel,
  ConnectionState,
  Contract,
  BarSizeSetting,
  Bar as IBBar,
} from '@stoqey/ib';
import series from 'promise-series2';
import {
  startOfDay,
  differenceInDays,
  min,
  addDays,
  isBefore,
  format,
  parse,
} from 'date-fns';

import {deDuplicateObjectArray} from '../../data-structures';

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

import {TimeSeriesPeriod, DataProvider, Instrument, Bar} from '../../../core';
import Logger from '../../../utils/logger';
import Env from '../../../utils/env';

const log = Logger('IB');

const barRequestBatchSize: Record<TimeSeriesPeriod, number> = {
  m1: 1,
  m5: 5,
  m60: 60,
  daily: 100,
};

export function formatIbRequestDate(date: Date) {
  return format(date, 'yyyyMMdd HH:mm:ss');
}

type Block = {
  end: string;
  duration: string;
};

export function splitDatesIntoBlocks(
  from: Date,
  to: Date,
  barSize: TimeSeriesPeriod,
) {
  const blocks: Block[] = [];

  const dayIncrement = barRequestBatchSize[barSize];

  for (
    let date = startOfDay(from);
    isBefore(date, startOfDay(to));
    date = addDays(date, dayIncrement + 1)
  ) {
    const blockTo = min([addDays(date, dayIncrement), to]);

    blocks.push({
      end: formatIbRequestDate(blockTo),
      duration: `${differenceInDays(blockTo, date)} D`,
    });
  }

  return blocks;
}

export function create(): DataProvider {
  const api = new IBApiNext({
    reconnectInterval: 10000,
    host: Env.IB_HOST,
    port: Number(Env.IB_PORT),
  });

  api.errorSubject.subscribe(err => {
    console.log('Err', err);
  });

  async function init() {
    return new Promise<void>(resolve => {
      api.logLevel = LogLevel.INFO;
      api.errorSubject.subscribe(err => {
        log('Error', err);
      });

      api.connectionState.subscribe(async state => {
        if (state === ConnectionState.Connected) {
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
    from: Date,
    to: Date,
    period: TimeSeriesPeriod,
  ): Promise<Bar[]> {
    const blocks = splitDatesIntoBlocks(from, to, period);
    const contract: Contract = instrument.data as Contract;

    const bars = await series<Block, IBBar[]>(
      async ({end, duration}) => {
        return api.getHistoricalData(
          contract,
          end,
          duration,
          barSizeLookup[period],
          'TRADES',
          0,
          1,
        );
      },
      null,
      blocks,
    );

    const results = bars.flat().map(bar => {
      const parseFormat = barSizeParseLookup[period];
      const time = parse(bar.time || '', parseFormat, new Date());
      return {
        open: bar.open || 0,
        high: bar.high || 0,
        low: bar.low || 0,
        close: bar.close || 0,
        volume: bar.volume || 0,
        time: format(time, 'yyyy-MM-dd HH:mm:ss'),
      };
    });

    // Deduplicate the results array because we don't have a reliable way of knowing if the market
    // was open or not the days requested. If the market was not open then IB will return data for the
    // previous day which can result in duplicates

    return deDuplicateObjectArray(results, bar => bar.time);
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
      name: String(contract.longName),
      data: contract.contract,
    }));
  }

  return {
    name: 'ib',
    init,
    shutdown,
    getTimeSeries,
    instrumentLookup,
  };
}
