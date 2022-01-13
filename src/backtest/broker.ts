import {Tick} from '../core';

type OrderAction = 'BUY' | 'SELL';
type OrderType = 'MKT' | 'LMT' | 'STP' | 'TRAIL';
type OrderState = 'ACCEPTED' | 'PENDING';

export type Order = {
  id: number;
  parentId?: number;
  openedAt: Date;
  state: OrderState;
  symbol: string;
  action: OrderAction;
  type: OrderType;
  shares: number;
};

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
};

export function initBroker({
  getMarketTime,
}: {
  getMarketTime: () => Date;
}): BrokerState {
  return {
    getMarketTime,
    nextOrderId: 0,
    orders: [],
    openOrders: {},
    positions: [],
    openPositions: {},
  };
}

/*
The big question, do we mutate BrokerState in the function or always return a new one?

It would be much simpler to mutate it but that's not the best thing to do.. is it?

Mutating would be faster because we don't need to re-create the state object all the time
*/

export function placeOrder(
  state: BrokerState,
  spec: OrderSpecification,
): {state: BrokerState; order: Order} {
  // Get the next order id
  const nextOrderId = state.nextOrderId + 1;

  const order: Order = {
    ...spec,
    id: nextOrderId,
    openedAt: state.getMarketTime(),
    state: spec.parentId ? 'ACCEPTED' : 'PENDING',
  };

  // Add the orders

  return {
    state: {
      ...state,
      nextOrderId,
      orders: [...state.orders, order],
      openOrders: {
        ...state.openOrders,
        [nextOrderId]: order,
      },
    },
    order,
  };
}

export function handleTick(state: BrokerState, tick: Tick) {
  // do something...
}
