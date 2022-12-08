import {OrderState, Instrument} from '../../core';
import {
  create,
  isPendingOrder,
  isFilledOrder,
  cleanExecId,
} from '../../utils/positions';

import {
  connect,
  disconnect,
  resetDatabase,
  createLivePosition,
  loadOpenPositions,
  createLiveOrder,
  updatePositionClosing,
  updateLiveOrderExecution,
  updateLiveOrder,
} from '../../utils/db';

let nextOrderId = 0;

function getNextOrderId() {
  return nextOrderId++;
}

describe('test the order position/storage module', () => {
  beforeAll(async () => {
    // Reset the test database
    await resetDatabase();

    // Connect again
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  const instrumentA: Instrument = {
    symbol: 'AAAA',
    externalId: '',
    data: null,
    name: 'AAAA CORP',
  };

  const instrumentB: Instrument = {
    symbol: 'BBBB',
    externalId: '',
    data: null,
    name: 'BBBB CORP',
  };

  test('basic position setup', async () => {
    const positions = create();
    await positions.init();
    expect(positions.hasOpenOrders('test-1', instrumentA)).toBe(false);
    await positions.shutdown();
  });

  test('check if an order is open', () => {
    const tests: Array<{
      state: OrderState;
      result: boolean;
    }> = [
      {
        state: 'ACCEPTED',
        result: true,
      },
      {
        state: 'CANCELLED',
        result: false,
      },
      {
        state: 'FILLED',
        result: false,
      },
      {
        state: 'PENDING',
        result: true,
      },
    ];

    tests.forEach(({state, result}) => {
      expect(isPendingOrder({state})).toBe(result);
    });
  });

  test('check if an order is filled', () => {
    const tests: Array<{
      state: OrderState;
      result: boolean;
    }> = [
      {
        state: 'ACCEPTED',
        result: false,
      },
      {
        state: 'CANCELLED',
        result: false,
      },
      {
        state: 'FILLED',
        result: true,
      },
      {
        state: 'PENDING',
        result: false,
      },
    ];

    tests.forEach(({state, result}) => {
      expect(isFilledOrder({state})).toBe(result);
    });
  });

  test('has no open position', async () => {
    const positions = create();
    await positions.init();
    expect(positions.hasOpenPosition('test-1', instrumentA)).toBe(false);
    await positions.shutdown();
  });

  test('create an order', async () => {
    const positions = create();
    await positions.init();

    const profileId = 'test-2';

    const orderId1 = getNextOrderId();
    const orderId2 = getNextOrderId();

    positions.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentB.symbol,
      executions: {},
    });

    expect(positions.hasOpenPosition(profileId, instrumentA)).toBe(true);
    expect(positions.hasOpenOrders(profileId, instrumentA)).toBe(true);

    positions.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId2,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentB.symbol,
      executions: {},
    });

    expect(positions.hasOpenPosition(profileId, instrumentA)).toBe(true);
    expect(positions.hasOpenOrders(profileId, instrumentA)).toBe(true);

    await positions.writeDbUpdates();
    await positions.shutdown();
  });

  async function loadOpenPositionsForSymbol(symbol: string) {
    const positions = await loadOpenPositions();
    return positions.filter(p => p.symbol === symbol);
  }

  async function getOpenPositionsForSymbolCount(symbol: string) {
    const positions = await loadOpenPositionsForSymbol(symbol);
    return positions.length;
  }

  test('store position and load open positions', async () => {
    const testId = 'store-position-1';

    expect(await getOpenPositionsForSymbolCount(testId)).toBe(0);

    await createLivePosition({
      openedAt: new Date(),
      closedAt: null,
      isClosing: false,
      orders: [],
      symbol: testId,
      data: {},
      profileId: testId,
      externalId: testId,
      closeReason: '',
    });

    expect(await getOpenPositionsForSymbolCount(testId)).toBe(1);
  });

  test('store an order with a position', async () => {
    const testId = 'store-position-2';

    const orderId = getNextOrderId();

    await createLivePosition({
      openedAt: new Date(),
      closedAt: null,
      isClosing: false,
      orders: [],
      symbol: testId,
      data: {},
      profileId: testId,
      externalId: testId,
      closeReason: '',
    });

    await createLiveOrder(testId, {
      id: orderId,
      type: 'MKT',
      shares: 100,
      remaining: 100,
      action: 'BUY',
      symbol: testId,
      openedAt: new Date(),
      state: 'ACCEPTED',
      executions: {},
    });

    // get the position
    const positions = await loadOpenPositionsForSymbol(testId);

    expect(positions[0].orders.length).toBe(1);
    expect(positions[0].orders[0]).toEqual(
      expect.objectContaining({
        id: orderId,
      }),
    );
  });

  test('store executions for an order', async () => {
    const testId = 'store-position-executions-1';

    const orderId = getNextOrderId();

    await createLivePosition({
      openedAt: new Date(),
      closedAt: null,
      isClosing: false,
      orders: [],
      symbol: testId,
      data: {},
      profileId: testId,
      externalId: testId,
      closeReason: '',
    });

    await createLiveOrder(testId, {
      id: orderId,
      type: 'MKT',
      shares: 100,
      remaining: 100,
      action: 'BUY',
      symbol: testId,
      openedAt: new Date(),
      state: 'ACCEPTED',
      executions: {},
    });

    const execs = {
      exec1: {
        commission: 1,
        price: 1,
        shares: 50,
        data: {},
      },
      exec2: {
        commission: 1,
        price: 1.5,
        shares: 50,
        data: {},
      },
    };

    await updateLiveOrderExecution(testId, orderId, 'exec1', execs.exec1);
    await updateLiveOrderExecution(testId, orderId, 'exec2', execs.exec2);

    // get the order and make
    const positions = await loadOpenPositionsForSymbol(testId);

    expect(positions[0].orders[0].executions['exec1']).toEqual(
      expect.objectContaining(execs.exec1),
    );

    expect(positions[0].orders[0].executions['exec2']).toEqual(
      expect.objectContaining(execs.exec2),
    );
  });

  test('set a position to be closing with a reason', async () => {
    const testId = 'store-position-3';

    expect(await getOpenPositionsForSymbolCount(testId)).toBe(0);

    await createLivePosition({
      openedAt: new Date(),
      closedAt: null,
      isClosing: false,
      orders: [],
      symbol: testId,
      data: {},
      profileId: testId,
      externalId: testId,
      closeReason: null,
    });

    const positions1 = await loadOpenPositionsForSymbol(testId);
    expect(positions1[0].isClosing).toBe(false);
    expect(positions1[0].closeReason).toBe(null);

    await updatePositionClosing(testId, 'some reason');

    const positions2 = await loadOpenPositionsForSymbol(testId);
    expect(positions2[0].isClosing).toBe(true);
    expect(positions2[0].closeReason).toBe('some reason');
  });

  test('update the status of an order', async () => {
    const testId = 'store-position-order-status-1';

    const orderId = getNextOrderId();

    await createLivePosition({
      openedAt: new Date(),
      closedAt: null,
      isClosing: false,
      orders: [],
      symbol: testId,
      data: {},
      profileId: testId,
      externalId: testId,
      closeReason: null,
    });

    await createLiveOrder(testId, {
      id: orderId,
      type: 'MKT',
      shares: 100,
      remaining: 100,
      action: 'BUY',
      symbol: testId,
      openedAt: new Date(),
      state: 'ACCEPTED',
      executions: {},
    });

    // get the position
    const positions1 = await loadOpenPositionsForSymbol(testId);
    expect(positions1[0].orders[0].state).toBe('ACCEPTED');

    // update the status
    await updateLiveOrder(testId, orderId, {
      state: 'FILLED',
    });

    // check
    const positions2 = await loadOpenPositionsForSymbol(testId);
    expect(positions2[0].orders[0].state).toBe('FILLED');
  });

  test('save position data to the db and load it again', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-save-and-load-positions';

    const orderId = getNextOrderId();

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    await positions1.writeDbUpdates();
    await positions1.shutdown();

    // load the positions from the db and check that ew still have open orders and positions
    const positions2 = create();
    await positions2.init();

    expect(positions2.hasOpenPosition(profileId, instrumentA)).toBe(true);
    expect(positions2.hasOpenOrders(profileId, instrumentA)).toBe(true);

    await positions2.shutdown();
  });

  test('update the state of an order', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-update-order-state';

    const orderId = getNextOrderId();

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions1.hasOpenOrders(profileId, instrumentA)).toBe(true);
    positions1.updateOrder(orderId, {
      state: 'FILLED',
    });
    expect(positions1.hasOpenOrders(profileId, instrumentA)).toBe(false);

    // write the changes
    await positions1.writeDbUpdates();
    await positions1.shutdown();

    // load from db
    const positions2 = create();
    await positions2.init();

    positions2.updateOrder(1, {
      state: 'FILLED',
    });
  });

  test('add order exec details to an order', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-update-order-exec';

    const orderId = getNextOrderId();

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    const execs = {
      exec1: {
        commission: 1,
        price: 10,
        shares: 45,
      },
      exec2: {
        commission: 1,
        price: 10,
        shares: 55,
      },
    };

    positions1.updateOrderExecution(orderId, 'exec1', execs.exec1);
    positions1.updateOrderExecution(orderId, 'exec2', execs.exec2);

    const position1 = positions1.getOpenPosition(profileId, instrumentA);

    expect(position1).not.toBe(null);
    expect(position1?.orders[0].executions.exec1).toEqual(
      expect.objectContaining(execs.exec1),
    );
    expect(position1?.orders[0].executions.exec2).toEqual(
      expect.objectContaining(execs.exec2),
    );

    // test saving execs to the db
    await positions1.writeDbUpdates();

    // load the positions from the db and check that ew still have open orders and positions
    const positions2 = create();
    await positions2.init();

    const position2 = positions2.getOpenPosition(profileId, instrumentA);

    expect(position2).not.toBe(null);
    expect(position2?.orders[0].executions.exec1).toEqual(
      expect.objectContaining(execs.exec1),
    );
    expect(position2?.orders[0].executions.exec2).toEqual(
      expect.objectContaining(execs.exec2),
    );

    await positions1.shutdown();
  });

  test('get an order form the exec id', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-getting-order-from-exec-id';

    const orderId = getNextOrderId();

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    const execs = {
      exec1: {
        commission: 1,
        price: 10,
        shares: 45,
      },
      exec2: {
        commission: 1,
        price: 10,
        shares: 55,
      },
    };

    positions1.updateOrderExecution(
      orderId,
      'test_random_exec_id_1',
      execs.exec1,
    );
    positions1.updateOrderExecution(
      orderId,
      'test_random_exec_id_2',
      execs.exec2,
    );

    expect(positions1.getOrderIdFromExecId('test_random_exec_id_1')).toBe(
      orderId,
    );
    expect(positions1.getOrderIdFromExecId('test_random_exec_id_2')).toBe(
      orderId,
    );

    expect(positions1.getOrderIdFromExecId('invalid_exec_id')).toBe(null);

    await positions1.shutdown();
  });

  test('update the order state of an invalid position', async () => {
    const positions = create();
    await positions.init();

    positions.updateOrder(999999, {
      state: 'FILLED',
    });

    await positions.shutdown();
  });

  test('update the order execution of an invalid position', async () => {
    const positions = create();
    await positions.init();

    positions.updateOrderExecution(1, 'exec1', {
      commission: 1,
      price: 10,
      shares: 45,
    });

    await positions.shutdown();
  });

  test('check open position size', async () => {
    const positions = create();
    await positions.init();

    const profileId = 'test-open-position-size';

    const orderId1 = getNextOrderId();
    const orderId2 = getNextOrderId();
    const orderId3 = getNextOrderId();

    expect(positions.getPositionSize(profileId, instrumentA)).toBe(0);

    positions.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions.getPositionSize(profileId, instrumentA)).toBe(0);

    // fill the position
    positions.updateOrder(orderId1, {
      state: 'FILLED',
    });

    expect(positions.getPositionSize(profileId, instrumentA)).toBe(100);

    positions.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId2,
      action: 'SELL',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions.getPositionSize(profileId, instrumentA)).toBe(100);

    // fill the position
    positions.updateOrder(orderId2, {
      state: 'FILLED',
    });

    expect(positions.getPositionSize(profileId, instrumentA)).toBe(0);

    // set the open position size by creating a new order
    positions.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId3,
      action: 'BUY',
      state: 'FILLED',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions.getPositionSize(profileId, instrumentA)).toBe(100);

    await positions.shutdown();
  });

  test('set a position to be closing', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-closing-position';
    const orderId = getNextOrderId();

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId,
      action: 'BUY',
      state: 'FILLED',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions1.hasOpenPosition(profileId, instrumentA)).toBe(true);
    expect(positions1.getPositionSize(profileId, instrumentA)).toBe(100);

    const position1 = positions1.getOpenPosition(profileId, instrumentA);
    expect(position1?.isClosing).toBe(false);
    expect(position1?.closeReason).toBe(null);

    positions1.setPositionClosing(
      profileId,
      instrumentA,
      'Test closing a position',
    );

    // save to the db
    await positions1.writeDbUpdates();
    await positions1.shutdown();

    // load the positions from the db and check that ew still have open orders and positions
    const positions2 = create();
    await positions2.init();

    const position2 = positions2.getOpenPosition(profileId, instrumentA);

    expect(position2?.isClosing).toBe(true);
    expect(position2?.closeReason).toBe('Test closing a position');

    await positions2.shutdown();
  });

  test('clean exec id', () => {
    const execId = '0000e0d5.640275e2.01.01';
    expect(cleanExecId(execId)).toBe('0000e0d5:640275e2:01:01');
  });

  test('open a new position and close it when we have a position size of 0', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-close-position-when-no-shares';

    const orderId1 = getNextOrderId();
    const orderId2 = getNextOrderId();

    expect(positions1.getPositionSize(profileId, instrumentA)).toBe(0);

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions1.getPositionSize(profileId, instrumentA)).toBe(0);

    // fill the position
    positions1.updateOrder(orderId1, {
      state: 'FILLED',
    });

    expect(positions1.getPositionSize(profileId, instrumentA)).toBe(100);

    // make sure the position has been closed
    expect(positions1.hasOpenPosition(profileId, instrumentA)).toBe(true);

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId2,
      action: 'SELL',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions1.getPositionSize(profileId, instrumentA)).toBe(100);

    // fill the position
    positions1.updateOrder(orderId2, {
      state: 'FILLED',
    });

    expect(positions1.getPositionSize(profileId, instrumentA)).toBe(0);

    // make sure the position has been closed
    expect(positions1.hasOpenPosition(profileId, instrumentA)).toBe(false);

    // write db updates
    await positions1.writeDbUpdates();
    await positions1.shutdown();

    // load positions again and make sure we don't have any open positions
    const positions2 = create();
    await positions2.init();

    expect(positions2.hasOpenPosition(profileId, instrumentA)).toBe(false);
  });

  test('check that a position is closing', async () => {
    const positions1 = create();
    await positions1.init();

    // check an invalid profile id
    expect(
      positions1.isClosing('invalid-is-closing-profile-id', instrumentA),
    ).toBe(false);

    const profileId = 'test-check-position-closing-status';
    const orderId1 = getNextOrderId();

    expect(positions1.isClosing(profileId, instrumentA)).toBe(false);

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    // we are not closing
    expect(positions1.isClosing(profileId, instrumentA)).toBe(false);
    positions1.setPositionClosing(profileId, instrumentA, 'test closing');

    // we should now be closing
    expect(positions1.isClosing(profileId, instrumentA)).toBe(true);

    // save results to the db and make sure we are still closing
    await positions1.writeDbUpdates();

    const positions2 = create();
    await positions2.init();

    expect(positions2.isClosing(profileId, instrumentA)).toBe(true);
  });

  test('get positions by profile id', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-get-positions-by-profile-id';
    const orderId1 = getNextOrderId();

    expect(positions1.getPositions(profileId).length).toBe(0);

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions1.getPositions(profileId).length).toBe(1);
  });

  test('get orders by profile id', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-get-orders-by-profile-id';
    const orderId1 = getNextOrderId();

    expect(positions1.getOrders(profileId).length).toBe(0);

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions1.getOrders(profileId).length).toBe(1);
  });

  test('test that an order status update is reflected in the getOrders function', async () => {
    const positions1 = create();
    await positions1.init();

    const profileId = 'test-update-status-check-orders';
    const orderId1 = getNextOrderId();

    expect(positions1.getOrders(profileId).length).toBe(0);

    positions1.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      remaining: 100,
      id: orderId1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol: instrumentA.symbol,
      executions: {},
    });

    expect(positions1.getOrders(profileId).length).toBe(1);
    expect(positions1.getOrders(profileId)[0].state).toBe('PENDING');

    positions1.updateOrder(orderId1, {
      state: 'FILLED',
    });

    expect(positions1.getOrders(profileId)[0].state).toBe('FILLED');
  });
});
