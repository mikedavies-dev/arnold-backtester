/*

# placeOrder
When we place an order we save the details along with the ID and profileId to the db
so any future updates are associated with the profile

When we start we load any open orders from the db

1. How can we update their state if we miss an update when the app is closed? reqCompletedOrders ?

# Events
We need to keep an internal list of open orders and open positions associated with each profileId

# hasOpenOrders

# getPositionSize

# EventName.openOrder
1. Update the db
2. If the order is not 'CANCELLED' or 'FILLED' (?) keep/update it in open orders
3. If the order is 'CANCELLED' or 'FILLED' then remove it from openOrders

# EventName.position
How do we associate positions with profileIds? We need to load positions from the db and
match those positions which are still open with the open position from IB

If there is a mismatch then we need to show that with a null profileId?

*/

import {format} from 'date-fns';
import {Contract, Order, OrderAction, OrderType} from '@stoqey/ib';

import {init as initIb} from '../wrappers/ib-wrapper';
import {create as createPositionManagement} from '../../positions';
import {BrokerProvider, LoggerCallback, PlaceOrderArgs} from '../../../core';

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

  const positions = createPositionManagement();

  async function init({workerIndex}: {workerIndex?: number} = {}) {
    const offset = (workerIndex || 0) + 1;
    const clientId = offset * 10 + currentApiClientId;

    // Increment the id
    currentApiClientId += 1;

    await api.connect(clientId);
    log?.('Connected to IB');

    await positions.init();
  }

  async function shutdown() {
    await positions.shutdown();

    log?.('Shutting down');
    return api.disconnect();
  }

  async function loadState(profileId: string, balance: number) {
    // TODO Load data from DB for this profile
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

  function placeOrder({instrument, order}: PlaceOrderArgs) {
    function getOrderType(): Order {
      switch (order.type) {
        case 'LMT':
          return {
            orderType: OrderType.LMT,
            lmtPrice: order.price,
          };

        case 'MKT':
          return {
            orderType: OrderType.MKT,
          };

        case 'STP':
          return {
            orderType: OrderType.STP,
            auxPrice: order.price,
            totalQuantity: order.shares,
          };

        case 'TRAIL':
          return {
            orderType: OrderType.TRAIL,
            auxPrice: order.price,
            totalQuantity: order.shares,
          };
      }
    }

    const orderId = api.placeOrder({
      contract: instrument.data as Contract,
      order: {
        ...getOrderType(),
        action: order.action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
        totalQuantity: order.shares,
        parentId: order.parentId,
        tif: 'DAY',
      },
    });

    return orderId;
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
