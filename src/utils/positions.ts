import {OrderState, Position} from '../core';

export function isPendingOrder(order: {state: OrderState}) {
  return ['ACCEPTED', 'PENDING'].indexOf(order.state) !== -1;
}

export function create() {
  const dbUpdates: {
    timer: NodeJS.Timer | null;
    queue: any[];
  } = {
    timer: null,
    queue: [],
  };

  const positions: Map<string, Position> = new Map();

  const getPositionKey = (profileId: string, symbol: string) =>
    `${profileId}:${symbol}`;

  async function storeDatabaseUpdates() {
    if (!dbUpdates.queue.length) {
      return;
    }
  }

  function queueDatabaseUpdate() {}

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
  }

  function hasOpenOrders(profileId: string, symbol: string) {
    const position = positions.get(getPositionKey(profileId, symbol));

    if (!position) {
      return false;
    }

    return position.orders.some(isPendingOrder);
  }

  return {
    init,
    shutdown,
    hasOpenOrders,
  };
}
