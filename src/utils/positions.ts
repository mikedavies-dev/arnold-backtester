import {v4 as uuidv4} from 'uuid';

import {
  LoggerCallback,
  Order,
  LivePosition,
  OrderExecution,
  Instrument,
  PositionProvider,
} from '../core';

import {
  currentPositionSize,
  isFilledOrder,
  isPositionOpen,
  isPendingOrder,
} from './derived';

import {
  createLivePosition,
  createLiveOrder,
  updateLiveOrderExecution,
  updatePositionClosing,
  updateLiveOrder,
  closePosition,
  loadTodayPositions,
} from '../utils/db';

export function cleanExecId(execId: string) {
  // Mongo doesn't like some.exec.value so replace with :
  return execId.replace(/\./gi, ':');
}

export function create({log}: {log?: LoggerCallback} = {}): PositionProvider {
  const dbUpdates: {
    queue: Array<() => Promise<void>>;
  } = {
    queue: [],
  };

  const positions: Array<{
    profileId: string;
    position: LivePosition;
  }> = [];

  const profileIdToOrders: Record<string, Array<Order>> = {};
  const profileIdToPositions: Record<string, Array<LivePosition>> = {};

  function addProfileOrders(profileId: string, toAdd: Array<Order>) {
    profileIdToOrders[profileId] = profileIdToOrders[profileId] || [];
    profileIdToOrders[profileId].push(...toAdd);
  }

  function addProfilePosition(profileId: string, toAdd: LivePosition) {
    profileIdToPositions[profileId] = profileIdToPositions[profileId] || [];
    profileIdToPositions[profileId].push(toAdd);
  }

  async function writeDbUpdates() {
    if (dbUpdates.queue.length) {
      log?.(`Writing ${dbUpdates.queue.length} updates to the database`);
    }

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

  async function shutdown() {}

  async function init() {
    // Load open positions form the db and store in memory
    const dbPositions = await loadTodayPositions();

    dbPositions.forEach(dbPosition => {
      const {symbol, profileId} = dbPosition;

      const position = {
        externalId: dbPosition.externalId,
        profileId,
        symbol,
        orders: dbPosition.orders,
        size: 0,
        data: dbPosition.data,
        closeReason: dbPosition.closeReason,
        isClosing: dbPosition.isClosing,
        openedAt: dbPosition.openedAt,
        closedAt: dbPosition.closedAt,
      };

      updatePositionSize(position);

      positions.push({
        profileId,
        position,
      });

      addProfilePosition(profileId, position);
      addProfileOrders(profileId, position.orders);
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

  function getPositionFromOrderId(orderId: number) {
    const entry = positions.find(p =>
      p.position.orders.find(o => o.id === orderId),
    );

    if (!entry) {
      return null;
    }

    return entry.position;
  }

  function getOrderIdFromExecId(execId: string) {
    const cleanedId = cleanExecId(execId);

    for (let index = 0; index < positions.length; index += 1) {
      const {position} = positions[index];

      // find the order with this execution id
      const order = position.orders.find(o => Boolean(o.executions[cleanedId]));

      if (order) {
        return order.id;
      }
    }

    return null;
  }

  function updatePositionSize(position: LivePosition) {
    // update the position size based on filled orders
    position.size = currentPositionSize(position);

    // close the position if our new size is 0, we haven't already been
    // closed and we have at least one filled order
    if (
      position.size === 0 &&
      !position.closedAt &&
      position.orders.filter(isFilledOrder).length > 0
    ) {
      log?.(`Closing position for ${position.externalId}/${position.symbol}`);

      position.closedAt = new Date();
      dbUpdates.queue.push(() =>
        closePosition(position.externalId, position.closedAt as Date),
      );
    }
  }

  function createOrder(
    profileId: string,
    instrument: Instrument,
    order: Order,
  ) {
    if (!hasOpenPosition(profileId, instrument)) {
      log?.(`Creating new position for ${instrument.symbol}`);

      const orders = [order];

      const newPosition = {
        externalId: uuidv4(),
        profileId,
        symbol: instrument.symbol,
        orders,
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
        }),
      );

      dbUpdates.queue.push(() =>
        createLiveOrder(newPosition.externalId, order),
      );

      updatePositionSize(newPosition);

      addProfilePosition(profileId, newPosition);
    } else {
      const position = getOpenPosition(profileId, instrument) as LivePosition;

      log?.(
        `Creating new order for ${instrument.symbol} (${position.externalId}) (${order.shares}/${order.action}/${order.type})`,
      );

      position.orders.push(order);

      updatePositionSize(position);

      // queue the db update
      dbUpdates.queue.push(() => createLiveOrder(position.externalId, order));
    }

    addProfileOrders(profileId, [order]);
  }

  function updateOrder(orderId: number, updates: Partial<Order>) {
    const position = getPositionFromOrderId(orderId);

    if (position) {
      log?.(
        `Order update ${orderId} to with keys ${Object.keys(updates).join(
          ', ',
        )}`,
      );

      position.orders.forEach(order => {
        if (order.id === orderId) {
          Object.keys(updates).forEach(key => {
            const field = key as keyof Order;
            (order[field] as any) = updates[field];
          });
        }
      });

      updatePositionSize(position);

      // update the db
      dbUpdates.queue.push(() =>
        updateLiveOrder(position.externalId, orderId, updates),
      );
    }
  }

  function updateOrderExecution(
    orderId: number,
    execId: string,
    execution: Partial<OrderExecution>,
  ) {
    const position = getPositionFromOrderId(orderId);

    // Mongo doesn't like some.exec.value so replace with :
    const cleanedId = cleanExecId(execId);

    // update memory
    if (position) {
      log?.(
        `Execution update ${orderId}/${cleanedId} with ${Object.keys(
          execution,
        ).join(', ')}`,
      );

      position.orders.forEach(order => {
        if (order.id === orderId) {
          const fullExecution = {
            ...(order.executions[cleanedId] || {}),
            ...execution,
          };

          order.executions[cleanedId] = fullExecution;

          // update the db
          dbUpdates.queue.push(() =>
            updateLiveOrderExecution(
              position.externalId,
              orderId,
              cleanedId,
              fullExecution,
            ),
          );
        }
      });
    }
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
    log?.(
      `Closing position ${profileId}/${instrument.symbol} with reason '${reason}'`,
    );

    const position = getOpenPosition(profileId, instrument);

    if (position) {
      position.closeReason = reason;
      position.isClosing = true;

      // update the db
      dbUpdates.queue.push(() =>
        updatePositionClosing(position.externalId, reason),
      );
    }
  }

  function isClosing(profileId: string, instrument: Instrument) {
    const position = getOpenPosition(profileId, instrument);

    if (!position) {
      return false;
    }

    return position.isClosing;
  }

  function getOrders(profileId: string) {
    return profileIdToOrders[profileId] || [];
  }

  function getPositions(profileId: string): Array<LivePosition> {
    return profileIdToPositions[profileId] || [];
  }

  function getAllPositions(): Array<LivePosition> {
    return Object.values(profileIdToPositions).flat();
  }

  return {
    init,
    shutdown,
    writeDbUpdates,
    hasOpenOrders,
    hasOpenPosition,
    createOrder,
    updateOrderExecution,
    getPositionSize,
    setPositionClosing,
    getOpenPosition,
    getOrderIdFromExecId,
    updateOrder,
    isClosing,
    getOrders,
    getPositions,
    getAllPositions,
  };
}
