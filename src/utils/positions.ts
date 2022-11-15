import {v4 as uuidv4} from 'uuid';

import {
  LoggerCallback,
  Order,
  OrderState,
  LivePosition,
  OrderExecution,
  Instrument,
} from '../core';

import {
  loadOpenPositions,
  createLivePosition,
  updateLiveOrderStatus,
  createLiveOrder,
  updateLiveOrderExecution,
  updatePositionClosing,
} from '../utils/db';

export function isPendingOrder(order: {state: OrderState}) {
  return ['ACCEPTED', 'PENDING'].indexOf(order.state) !== -1;
}

export function isFilledOrder(order: {state: OrderState}) {
  return order.state === 'FILLED';
}

export function isPositionOpen(position: LivePosition) {
  return !position.closedAt;
}

export function create({log}: {log?: LoggerCallback} = {}) {
  const dbUpdates: {
    timer: NodeJS.Timer | null;
    queue: Array<() => Promise<void>>;
  } = {
    timer: null,
    queue: [],
  };

  const positions: Array<{
    profileId: string;
    position: LivePosition;
  }> = [];

  async function storeDatabaseUpdates() {
    // get the current queue
    const queue = dbUpdates.queue;

    // reset the queue
    dbUpdates.queue = [];

    while (queue.length) {
      const fn = queue.shift();
      if (fn) {
        await fn();
      }
    }
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

      positions.push({
        profileId,
        position: {
          externalId: dbPosition.externalId,
          symbol,
          orders: dbPosition.orders,
          size: dbPosition.orders
            .filter(isFilledOrder)
            .reduce((acc, order) => acc + order.shares, 0),
          data: dbPosition.data,
          closeReason: dbPosition.closeReason,
          isClosing: dbPosition.isClosing,
          openedAt: dbPosition.openedAt,
          closedAt: dbPosition.closedAt,
        },
      });
    });
  }

  function hasOpenOrders(profileId: string, instrument: Instrument) {
    return positions.some(
      e =>
        e.profileId === profileId &&
        e.position.symbol === instrument.symbol &&
        isPositionOpen(e.position) &&
        e.position.orders.some(isPendingOrder),
    );
  }

  function hasOpenPosition(profileId: string, instrument: Instrument) {
    return positions.some(
      e =>
        e.profileId === profileId &&
        e.position.symbol === instrument.symbol &&
        isPositionOpen(e.position),
    );
  }

  function getOpenPosition(profileId: string, instrument: Instrument) {
    const entry = positions.find(
      e =>
        e.profileId === profileId &&
        e.position.symbol === instrument.symbol &&
        isPositionOpen(e.position),
    );

    return entry?.position || null;
  }

  function createOrder(
    profileId: string,
    instrument: Instrument,
    order: Order,
  ) {
    if (!hasOpenPosition(profileId, instrument)) {
      const newPosition = {
        externalId: uuidv4(),
        symbol: instrument.symbol,
        orders: [],
        size: 0,
        data: null,
        closeReason: null,
        isClosing: false,
        openedAt: new Date(),
        closedAt: null,
      };

      positions.push({
        profileId,
        position: newPosition,
      });

      dbUpdates.queue.push(() =>
        createLivePosition({
          ...newPosition,
          profileId,
          _instrument: instrument,
        }),
      );
    }

    const position = getOpenPosition(profileId, instrument);

    if (!position) {
      log?.(`Position not found for ${profileId}/${instrument.symbol}`);
      return;
    }

    position.orders.push(order);

    // queue the db update
    dbUpdates.queue.push(() => createLiveOrder(position.externalId, order));
  }

  function updateOrderState(
    profileId: string,
    instrument: Instrument,
    orderId: number,
    state: OrderState,
  ) {
    const position = getOpenPosition(profileId, instrument);

    if (!position) {
      log?.(`Position not found for ${profileId}/${instrument.symbol}`);
      return;
    }

    position.orders.forEach(order => {
      if (order.id === orderId) {
        order.state = state;
      }
    });

    // update the db
    dbUpdates.queue.push(() =>
      updateLiveOrderStatus(position.externalId, orderId, state),
    );
  }

  function updateOrderExecution(
    profileId: string,
    instrument: Instrument,
    orderId: number,
    execId: string,
    execution: OrderExecution,
  ) {
    const position = getOpenPosition(profileId, instrument);

    // update memory
    if (!position) {
      log?.(`Position not found for ${profileId}/${instrument.symbol}`);
      return;
    }

    position.orders.forEach(order => {
      if (order.id === orderId) {
        order.executions[execId] = execution;
      }
    });

    // update the db
    dbUpdates.queue.push(() =>
      updateLiveOrderExecution(position.externalId, orderId, execId, execution),
    );
  }

  function getPositionSize(profileId: string, instrument: Instrument) {
    const position = getOpenPosition(profileId, instrument);
    return position?.size || 0;
  }

  function setPositionClosing(
    profileId: string,
    instrument: Instrument,
    reason: string | null,
  ) {
    const position = getOpenPosition(profileId, instrument);

    if (!position) {
      return;
    }

    position.closeReason = reason;
    position.isClosing = true;

    // update the db
    dbUpdates.queue.push(() =>
      updatePositionClosing(position.externalId, reason),
    );
  }

  return {
    init,
    shutdown,
    hasOpenOrders,
    hasOpenPosition,
    createOrder,
    updateOrderState,
    updateOrderExecution,
    getPositionSize,
    setPositionClosing,
  };
}
