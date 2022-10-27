import {format} from 'date-fns';

import {init as initIb} from '../wrappers/ib-wrapper';

import {
  BrokerProvider,
  LoggerCallback,
  OrderSpecification,
} from '../../../core';

import Env from '../../../utils/env';

const brokerClientIdOffset = 100;
let currentApiClientId = Number(Env.IB_BASE_CLIENT_ID) + brokerClientIdOffset;

export function formatIbRequestDate(date: Date) {
  return format(date, 'yyyyMMdd HH:mm:ss');
}

export function create({log}: {log?: LoggerCallback} = {}): BrokerProvider {
  const api = initIb({
    host: Env.IB_HOST,
    port: Number(Env.IB_PORT),
  });

  async function init({workerIndex}: {workerIndex?: number} = {}) {
    const offset = (workerIndex || 0) + 1;
    const clientId = offset * 10 + currentApiClientId;

    // Increment the id
    currentApiClientId += 1;

    return api.connect(clientId);
  }

  async function shutdown() {
    log?.('Shutting down');
    return api.disconnect();
  }

  async function loadState(profileId: string, balance: number) {
    // Load data from DB for this profile

    return {
      getMarketTime: () => new Date(),
      nextOrderId: 1,
      orders: [],
      openOrders: {},
      positions: [],
      openPositions: {},
      balance,
    };
  }

  function placeOrder(profileId: string, spec: OrderSpecification) {
    return 0;
  }

  function hasOpenOrders(profileId: string, symbol: string) {
    return false;
  }

  function getPositionSize(profileId: string, symbol: string) {
    return 0;
  }

  return {
    name: 'ib',
    init,
    shutdown,
    loadState,
    placeOrder,
    hasOpenOrders,
    getPositionSize,
  };
}
