/*
Although I'm trying to aim for functional style in Arnold I've decided to make
broker functions mutate the current state because these functions (especially handleTick)
are called very often and re-creating the state every time will put a lot of load
on the garbage collector and will slow things down.

So, against my better judgement I'm making functions that mutate on purpose :)
*/

import {differenceInMilliseconds} from 'date-fns';

import {Tracker} from '../utils/tracker';

type OrderAction = 'BUY' | 'SELL';
type OrderType = 'MKT' | 'LMT' | 'STP' | 'TRAIL';
type OrderState = 'ACCEPTED' | 'PENDING' | 'FILLED';

export type Order = {
  id: number;
  parentId?: number;
  openedAt: Date;
  state: OrderState;
  symbol: string;
  action: OrderAction;
  type: OrderType;
  shares: number;
  triggerPrice?: number;
  price?: number;
  filledAt?: Date;
  fillPrice?: number;
};

export type BaseOrder = {
  id: number;
  parentId?: number;
  openedAt: Date;
  state: OrderState;
  symbol: string;
  action: OrderAction;
  type: OrderType;
  shares: number;
  filledAt?: Date;
  fillPrice?: number;
};

/*
export type OrderType = 
  | BaseOrder & { type: 'MKT' }
  | BaseOrder & { type: 'STP'; price: number; triggerPrice?: number };
  */

export type OrderSpecification = Pick<
  Order,
  'action' | 'shares' | 'symbol' | 'type' | 'parentId'
>;

export type Position = {
  symbol: string;
  orders: Array<Order>;
  size: number;
  data: any;
  closeReason: string | null;
  isClosing: boolean;
};

export type BrokerState = {
  getMarketTime: () => Date;
  nextOrderId: number;
  orders: Array<Order>;
  openOrders: Record<number, Order>;
  positions: Array<Position>;
  openPositions: Record<string, Position>;
  orderExecutionDelayMs: number;
};

export function initBroker({
  getMarketTime,
}: {
  getMarketTime: () => Date;
}): BrokerState {
  return {
    getMarketTime,
    nextOrderId: 1,
    orders: [],
    openOrders: {},
    positions: [],
    openPositions: {},
    orderExecutionDelayMs: 1000,
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

function getChildOrders(openOrders: Record<number, Order>, orderId: number) {
  return Object.values(openOrders).filter(o => o.parentId === orderId);
}

export function handleTick(
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

  if (openOrdersForSymbol.length === 0) {
    return;
  }

  // fill the orders?
  const filledOrders = openOrdersForSymbol.filter(order => {
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
        return order.action === 'BUY' ? ask <= order.price : bid >= order.price;

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

      default:
        // Unknown order type
        throw new Error(`Unknown order type ${order.type}`);
    }
  });

  filledOrders.forEach(order => {
    // Fill the order
    order.filledAt = state.getMarketTime();
    order.state = 'FILLED';

    // were we filled at the bid or the ask?
    order.fillPrice = order.action === 'BUY' ? ask : bid;

    // update open positions
    const position = openPositions[symbol] || null;

    if (!position) {
      throw new Error('No open position for symbol');
    }

    position.size += order.action === 'BUY' ? order.shares : order.shares * -1;

    // Should we close the position?
    if (!position.size) {
      if (order.type === 'TRAIL') {
        position.closeReason = 'trailing-stop';
      }

      delete openPositions[symbol];
    }

    // set any child orders to pending
    const childOrders = getChildOrders(openOrders, order.id);
    childOrders.forEach(o => {
      o.state = 'PENDING';
    });

    // delete the open order
    delete openOrders[order.id];
  });
}
