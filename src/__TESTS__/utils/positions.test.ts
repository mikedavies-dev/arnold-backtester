import {OrderState, Instrument} from '../../core';
import {create, isPendingOrder} from '../../utils/positions';

import {
  connect,
  disconnect,
  resetDatabase,
  createLivePosition,
  loadOpenPositions,
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

  test('store position and load open positions', async () => {
    expect(
      (await loadOpenPositions()).filter(p => p.symbol === 'store-position-1')
        .length,
    ).toBe(0);

    await createLivePosition({
      openedAt: new Date(),
      closedAt: null,
      isClosing: false,
      orders: [],
      symbol: 'store-position-1',
      data: {},
      profileId: 'test3',
      externalId: '123',
      closeReason: '',
    });

    expect(
      (await loadOpenPositions()).filter(p => p.symbol === 'store-position-1')
        .length,
    ).toBe(1);
  });
});
