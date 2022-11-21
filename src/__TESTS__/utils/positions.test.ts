import {OrderState, Instrument} from '../../core';
import {create, isPendingOrder} from '../../utils/positions';

import {
  connect,
  disconnect,
  resetDatabase,
  createLivePosition,
  loadOpenPositions,
  createLiveOrder,
  updatePositionClosing,
  updateLiveOrderExecution,
  updateLiveOrderStatus,
} from '../../utils/db';

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

    positions.createOrder(profileId, instrumentA, {
      type: 'MKT',
      shares: 100,
      id: 1,
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
      id: 2,
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
      id: 1,
      type: 'MKT',
      shares: 100,
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
        id: 1,
      }),
    );
  });

  test('store executions for an order', async () => {
    const testId = 'store-position-executions-1';

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
      id: 1,
      type: 'MKT',
      shares: 100,
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

    await updateLiveOrderExecution(testId, 1, 'exec1', execs.exec1);
    await updateLiveOrderExecution(testId, 1, 'exec2', execs.exec2);

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
      id: 1,
      type: 'MKT',
      shares: 100,
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
    await updateLiveOrderStatus(testId, 1, 'FILLED');

    // check
    const positions2 = await loadOpenPositionsForSymbol(testId);
    expect(positions2[0].orders[0].state).toBe('FILLED');
  });
});
