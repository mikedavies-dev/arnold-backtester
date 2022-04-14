import {IBApiNext, LogLevel, ConnectionState, Contract} from '@stoqey/ib';
import series from 'promise-series2';

import {TimeSeriesPeriod, DataProvider, Instrument, Bar} from '../../../core';
import Logger from '../../../utils/logger';
import Env from '../../../utils/env';

const log = Logger('IB');

export function create(): DataProvider {
  const api = new IBApiNext({
    reconnectInterval: 10000,
    host: Env.IB_HOST,
    port: Number(Env.IB_PORT),
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
    return new Promise((resolve, reject) => {});
    return [];
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
