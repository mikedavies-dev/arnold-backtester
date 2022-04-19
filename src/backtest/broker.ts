/*
Although I'm trying to aim for functional style in Arnold I've decided to make
broker functions mutate the current state because these functions (especially handleTick)
are called very often and re-creating the state every time will put a lot of load
on the garbage collector and will slow things down.

So, against my better judgement I'm making functions that mutate on purpose :)
*/

import {differenceInMilliseconds} from 'date-fns';

import {Tracker, Order, BrokerState, OrderSpecification} from '../core';
import {getPositionPL, getPositionCommission} from '../utils/results-metrics';

export function initBroker({
  getMarketTime,
  orderExecutionDelayMs,
  initialBalance,
  commissionPerOrder,
}: {
  getMarketTime: () => Date;
  orderExecutionDelayMs?: number;
  initialBalance: number;
  commissionPerOrder: number;
}): BrokerState {
  return {
    getMarketTime,
    nextOrderId: 1,
    orders: [],
    openOrders: {},
    positions: [],
    openPositions: {},
    orderExecutionDelayMs: orderExecutionDelayMs || 1000,
    balance: initialBalance,
    commissionPerOrder,
  };
}

export function placeOrder(
  state: BrokerState,
  spec: OrderSpecification,
): number {
  // Get the next order id
  const orderId = state.nextOrderId;

  state.nextOrderId += 1;

  const order: Order = {
    ...spec,
    id: orderId,
    openedAt: state.getMarketTime(),
    state: spec.parentId ? 'ACCEPTED' : 'PENDING',
  };

  const {symbol} = spec;
  const {openPositions, positions, orders, openOrders} = state;

  // Add the orders
  openOrders[orderId] = order;
  orders.push(order);

  // Check current position
  if (!openPositions[spec.symbol]) {
    openPositions[symbol] = openPositions[symbol] || {
      symbol,
      orders: [],
      size: 0,
      data: {},
      closeReason: null,
      isClosing: false,
    };
    positions.push(openPositions[symbol]);
  }

  // Add the order to the position
  openPositions[symbol].orders.push(order);

  return orderId;
}

export function handleBrokerTick(
  state: BrokerState,
  symbol: string,
  tracker: Tracker,
) {
  const {openOrders, openPositions, orderExecutionDelayMs} = state;

  const {last, bid, ask} = tracker;

  // Get the open pending orders for this symbol
  const openOrdersForSymbol = Object.values(openOrders).filter(
    o => o.symbol === symbol && o.state === 'PENDING',
  );

  // fill the orders?
  openOrdersForSymbol
    .filter(order => {
      // Make sure enough time has passed
      if (
        differenceInMilliseconds(state.getMarketTime(), order.openedAt) <
        orderExecutionDelayMs
      ) {
        return false;
      }

      switch (order.type) {
        case 'MKT':
          // Market orders get filled after the time limit
          return true;

        case 'LMT':
          // Fill limit orders if the price doesn't pass the
          // limit price
          return order.action === 'BUY'
            ? ask <= order.price
            : bid >= order.price;

        case 'STP':
          // Fill the stop order if the price breaks the stop
          // price. The default trigger method of IB is to use the
          // last price, not the bid/ask
          // https://www.interactivebrokers.co.uk/en/software/tws/twsguide_Left.htm#CSHID=usersguidebook%2Fconfiguretws%2Fmodify_the_stop_trigger_method.htm|StartTopic=usersguidebook%2Fconfiguretws%2Fmodify_the_stop_trigger_method.htm|SkinName=ibskin

          return order.action === 'BUY'
            ? last >= order.price
            : last <= order.price;

        case 'TRAIL':
          /*
          A trailing buy order wil buy when the price goes up to cancel out a short position
          So if the trailing point is 0.1 and the price is:
            1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.6, 0.7, 0.8
          the trigger should have been 0.6
          */

          // The trigger price hasn't been set yet
          if (!order.triggerPrice) {
            order.triggerPrice =
              order.action === 'BUY' ? last + order.price : last - order.price;
          }

          // Calculate new trigger price
          order.triggerPrice =
            order.action === 'BUY'
              ? Math.min(order.triggerPrice, last + order.price)
              : Math.max(order.triggerPrice, last - order.price);

          // See if we passed the trigger value
          return order.action === 'BUY'
            ? last >= order.triggerPrice
            : last <= order.triggerPrice;
      }
    })
    .forEach(order => {
      // Fill the order
      order.filledAt = state.getMarketTime();
      order.state = 'FILLED';

      // were we filled at the bid or the ask?
      order.avgFillPrice = order.action === 'BUY' ? ask : bid;

      // update open positions
      const position = openPositions[symbol];

      position.size +=
        order.action === 'BUY' ? order.shares : order.shares * -1;

      // Should we close the position?
      if (!position.size) {
        if (order.type === 'TRAIL') {
          position.closeReason = 'trailing-stop';
        }

        // Update account balance
        state.balance +=
          getPositionPL(position) -
          getPositionCommission(position, state.commissionPerOrder);

        delete openPositions[symbol];
      }

      // set any child orders to pending
      const childOrders = Object.values(openOrders).filter(
        o => o.parentId === order.id,
      );
      childOrders.forEach(o => {
        o.state = 'PENDING';
      });

      // delete the open order
      delete openOrders[order.id];
    });
}

export function hasOpenOrders(state: BrokerState, symbol: string) {
  // This could be a performance issue!
  return Object.values(state.openOrders).some(
    o => o.symbol === symbol && o.state === 'PENDING',
  );
}

export function getPositionSize(state: BrokerState, symbol: string) {
  if (!state.openPositions[symbol]) {
    return 0;
  }

  return state.openPositions[symbol].size;
}

export function closeOrder(state: BrokerState, orderId: number) {
  // find the order
  if (!state.openOrders[orderId]) {
    // order not found
    return;
  }

  state.openOrders[orderId].state = 'CANCELLED';

  // remove the order
  delete state.openOrders[orderId];

  // close any child orders
  const childOrders = Object.values(state.openOrders).filter(
    o => o.parentId === orderId,
  );

  childOrders.forEach(childOrder => closeOrder(state, childOrder.id));
}

export function closeOpenOrders(state: BrokerState) {
  const ordersToClose = Object.values(state.openOrders);
  ordersToClose.forEach(order => closeOrder(state, order.id));
}

export function closePosition(
  state: BrokerState,
  symbol: string,
  reason: string | null = null,
) {
  const position = state.openPositions[symbol] || null;

  if (!position || position.isClosing) {
    return;
  }

  position.closeReason = reason;
  position.isClosing = true;

  // close open orders
  position.orders
    .filter(o => ['ACCEPTED', 'PENDING'].indexOf(o.state) !== -1)
    .forEach(o => {
      closeOrder(state, o.id);
    });

  // If we don't have any open shares then close the position
  if (position.size === 0) {
    delete state.openPositions[symbol];
    return;
  }

  const orderId = placeOrder(state, {
    type: 'MKT',
    action: position.size > 0 ? 'SELL' : 'BUY',
    symbol,
    shares: Math.abs(position.size),
  });

  return orderId;
}
