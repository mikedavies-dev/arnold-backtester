import {OrderState} from '../../core';
import {create, isPendingOrder} from '../../utils/positions';

describe('test the order position/storage module', () => {
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
});
