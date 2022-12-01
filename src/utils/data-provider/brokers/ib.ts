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
import {Contract, Order, OrderAction, OrderType, OrderStatus} from '@stoqey/ib';

import {init as initIb} from '../wrappers/ib-wrapper';

import {
  BrokerProvider,
  Instrument,
  LoggerCallback,
  OrderExecution,
  OrderState,
  PlaceOrderArgs,
  PositionProvider,
} from '../../../core';

import Env from '../../../utils/env';

const brokerClientIdOffset = 100;
let currentApiClientId = Number(Env.IB_BASE_CLIENT_ID) + brokerClientIdOffset;

export function formatIbRequestDate(date: Date) {
  return format(date, 'yyyyMMdd HH:mm:ss');
}

export function create({
  log,
  positions,
}: {
  log?: LoggerCallback;
  positions: PositionProvider;
}): BrokerProvider {
  const api = initIb({
    host: Env.IB_HOST,
    port: Number(Env.IB_PORT),
  });

  async function init({workerIndex}: {workerIndex?: number} = {}) {
    const offset = (workerIndex || 0) + 1;
    const clientId = offset * 10 + currentApiClientId;

    // Increment the id
    currentApiClientId += 1;

    await api.connect(clientId);
    log?.('Connected to IB');

    api.addGlobalHandler('ORDER_UPDATES', {
      [api.EventName.openOrder]: (orderId, contract, order, state) => {
        // log?.('openOrder', orderId, contract, order, state);

        positions.updateOrder(orderId, {
          data: order,
        });
      },
      [api.EventName.execDetails]: (contract, execution) => {
        // log?.('execDetails', contract, execution);

        const {orderId, execId} = execution;

        if (orderId && execId) {
          const updates: Partial<OrderExecution> = {};

          if (execution.shares) {
            updates.shares = execution.shares;
          }

          if (execution.price) {
            updates.price = execution.price;
          }

          positions.updateOrderExecution(orderId, execId, updates);
        }
      },
      [api.EventName.commissionReport]: report => {
        // log?.('commissionReport', report);
        const {execId} = report;

        if (execId) {
          const orderId = positions.getOrderIdFromExecId(execId);

          if (orderId) {
            const updates: Partial<OrderExecution> = {};

            if (report.commission) {
              updates.commission = report.commission;
            }

            if (report.realizedPNL) {
              updates.realizedPnL = report.realizedPNL;
            }

            positions.updateOrderExecution(orderId, execId, updates);
          }
        }
      },
      [api.EventName.orderStatus]: (
        orderId,
        status,
        filled,
        remaining,
        avgFillPrice,
        // permId,
        // parentId,
        // lastFillPrice,
        // clientId,
        // whyHeld,
        // mktCapPrice,
      ) => {
        // log?.('orderStatus', {
        //   orderId,
        //   status,
        //   filled,
        //   remaining,
        //   avgFillPrice,
        //   permId,
        //   parentId,
        //   lastFillPrice,
        //   clientId,
        //   whyHeld,
        //   mktCapPrice,
        // });

        const lookup: Partial<Record<OrderStatus, OrderState>> = {
          [OrderStatus.ApiCancelled]: 'CANCELLED',
          [OrderStatus.ApiPending]: 'PENDING',
          [OrderStatus.Cancelled]: 'CANCELLED',
          [OrderStatus.Filled]: 'FILLED',
          [OrderStatus.Inactive]: 'INACTIVE',
          [OrderStatus.PendingSubmit]: 'PENDING',
          [OrderStatus.PreSubmitted]: 'PENDING',
          [OrderStatus.Submitted]: 'PENDING',
          [OrderStatus.Unknown]: 'UNKNOWN',
        };

        const ourState = lookup[status];

        if (ourState) {
          positions.updateOrder(orderId, {
            state: ourState,
            remaining,
            avgFillPrice,
            filledAt: remaining === 0 ? new Date() : undefined,
          });
        }
      },
    });
  }

  async function shutdown() {
    log?.('Shutting down');
    return api.disconnect();
  }

  async function loadState(profileId: string, balance: number) {
    // TODO Load data from DB for this profile via positions
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

  function placeOrder({profileId, instrument, order}: PlaceOrderArgs) {
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

    positions.createOrder(profileId, instrument, {
      ...order,
      id: orderId,
      symbol: instrument.symbol,
      state: 'PENDING',
      openedAt: new Date(),
      remaining: order.shares,
      executions: {},
    });

    return orderId;
  }

  function hasOpenOrders(profileId: string, instrument: Instrument) {
    return positions.hasOpenOrders(profileId, instrument);
  }

  function getPositionSize(profileId: string, instrument: Instrument) {
    return positions.getPositionSize(profileId, instrument);
  }

  function closePosition(
    profileId: string,
    instrument: Instrument,
    reason: string | null,
  ) {
    // make sure the position is not already closing
    if (positions.isClosing(profileId, instrument)) {
      return;
    }

    // Place a market order for the current open position size
    const shares = getPositionSize(profileId, instrument);

    if (!shares) {
      // no open position
      return;
    }

    const orderId = placeOrder({
      profileId,
      instrument,
      order: {
        type: 'MKT',
        shares: Math.abs(shares),
        action: shares > 0 ? 'SELL' : 'BUY',
      },
    });

    // set the close reason
    positions.setPositionClosing(profileId, instrument, reason);

    return orderId;
  }

  return {
    name: 'ib',
    init,
    shutdown,
    loadState,
    placeOrder,
    hasOpenOrders,
    getPositionSize,
    closePosition,
  };
}
