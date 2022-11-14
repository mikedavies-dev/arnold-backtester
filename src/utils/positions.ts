import {v4 as uuidv4} from 'uuid';

import {notEmpty, Order, OrderState, LivePosition} from '../core';
import {loadOpenPositions} from '../utils/db';

export function isPendingOrder(order: {state: OrderState}) {
  return ['ACCEPTED', 'PENDING'].indexOf(order.state) !== -1;
}

export function isFilledOrder(order: {state: OrderState}) {
  return order.state === 'FILLED';
}

export function create() {
  const dbUpdates: {
    timer: NodeJS.Timer | null;
    queue: Map<string, LivePosition>;
  } = {
    timer: null,
    queue: new Map(),
  };

  const positions: Map<string, LivePosition> = new Map();

  const getPositionKey = (profileId: string, symbol: string) =>
    `${profileId}:${symbol}`;

  async function storeDatabaseUpdates() {
    const updates = Array.from(dbUpdates.queue.keys())
      .map(id => dbUpdates.queue.get(id))
      .filter(notEmpty);

    // TODO, update the DB
  }

  function queueDatabaseUpdate(id: string, position: LivePosition) {
    dbUpdates.queue.set(id, position);
  }

  async function shutdown() {
    if (dbUpdates.timer) {
      clearTimeout(dbUpdates.timer);
    }

    // Write any pending database updates
    await storeDatabaseUpdates();
  }

  async function init() {
    // Init the DB writer
    dbUpdates.timer = setInterval(storeDatabaseUpdates, 1000);

    // Load open positions form the db and store in memory
    const dbPositions = await loadOpenPositions();

    dbPositions.forEach(dbPosition => {
      const {symbol, profileId} = dbPosition;
      const key = getPositionKey(profileId, symbol);
      positions.set(key, {
        externalId: dbPosition.externalId,
        symbol,
        orders: dbPosition.orders,
        size: dbPosition.orders
          .filter(isFilledOrder)
          .reduce((acc, order) => acc + order.size),
        data: dbPosition.data,
        closeReason: dbPosition.closeReason,
        isClosing: dbPosition.isClosing,
        openedAt: dbPosition.openedAt,
        closedAt: dbPosition.closedAt,
      });
    });
  }

  function hasOpenOrders(profileId: string, symbol: string) {
    const entry = positions.get(getPositionKey(profileId, symbol));

    if (!entry) {
      return false;
    }

    return entry.orders.some(isPendingOrder);
  }

  function hasOpenPosition(profileId: string, symbol: string) {
    return positions.has(getPositionKey(profileId, symbol));
  }

  function createOrder(profileId: string, symbol: string, order: Order) {
    const key = getPositionKey(profileId, symbol);

    if (!hasOpenPosition(profileId, symbol)) {
      positions.set(key, {
        externalId: uuidv4(),
        symbol,
        orders: [],
        size: 0,
        data: null,
        closeReason: null,
        isClosing: false,
        openedAt: new Date(),
        closedAt: null,
      });
    }

    const position = positions.get(key) as LivePosition;

    // Add the order
    position.orders.push(order);

    // Enqueue the db update
    queueDatabaseUpdate(position.externalId, position);
  }

  function updateOrder(profileId: string, symbol: string, order: Order) {
    // Update the DB, matching any order with the same ID created today
    // Update the order in any positions we might have open
    // If the position is now closed then update it in the DB
  }

  return {
    init,
    shutdown,
    hasOpenOrders,
    hasOpenPosition,
    createOrder,
    updateOrder,
  };
}
