import {OrderState} from '../../core';
import {create, isPendingOrder} from '../../utils/positions';

import {connect, disconnect, resetDatabase} from '../../utils/db';

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

  test('basic position setup', async () => {
    const positions = create();
    await positions.init();
    expect(positions.hasOpenOrders('test-1', 'AAAA')).toBe(false);
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
    expect(positions.hasOpenPosition('test-1', 'AAAA')).toBe(false);
    await positions.shutdown();
  });

  test('create an order', async () => {
    const positions = create();
    await positions.init();

    const symbol = 'BBBB';
    const profileId = 'test-2';

    positions.createOrder(profileId, symbol, {
      type: 'MKT',
      shares: 100,
      id: 1,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol,
      executions: [],
    });

    expect(positions.hasOpenPosition(profileId, symbol)).toBe(true);
    expect(positions.hasOpenOrders(profileId, symbol)).toBe(true);

    positions.createOrder(profileId, symbol, {
      type: 'MKT',
      shares: 100,
      id: 2,
      action: 'BUY',
      state: 'PENDING',
      openedAt: new Date(),
      symbol,
      executions: [],
    });

    expect(positions.hasOpenPosition(profileId, symbol)).toBe(true);
    expect(positions.hasOpenOrders(profileId, symbol)).toBe(true);

    await positions.shutdown();
  });
});
