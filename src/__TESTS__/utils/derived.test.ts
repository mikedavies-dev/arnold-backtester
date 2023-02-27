import {
  isBuyOrder,
  orderRealizedPnL,
  percentChange,
  positionRealisedPnL,
  positionCommission,
  positionSize,
  positionAction,
  positionFillPrice,
  positionOpenPnL,
  currentPositionSize,
  positionPnL,
  positionEntryPrice,
  positionAvgEntryPrice,
  positionAvgExitPrice,
  positionExitAction,
} from '../../utils/derived';

import {initTracker} from '../../utils/tracker';

import {
  Position,
  Order,
  OrderState,
  OrderAction,
  OrderExecutions,
  Tracker,
} from '../../core';

function createOrder({
  shares,
  state,
  action,
  avgFillPrice,
  executions = {},
}: {
  shares: number;
  state: OrderState;
  action: OrderAction;
  executions?: OrderExecutions;
  avgFillPrice?: number;
}): Order {
  return {
    symbol: 'AAAA',
    remaining: 0,
    filledAt: new Date(),
    type: 'MKT',
    id: 1,
    openedAt: new Date(),
    executions,
    state,
    action,
    shares,
    avgFillPrice,
  };
}

function createPosition({orders}: {orders: Array<Order>}): Position {
  const position = {
    symbol: 'AAAA',
    size: 0,
    data: {},
    openedAt: new Date(),
    isClosing: false,
    closeReason: '',
    closedAt: null,
    orders,
  };

  position.size = currentPositionSize(position);

  return position;
}

function createTracker({last}: {last: number}): Tracker {
  return {
    ...initTracker(),
    last,
  };
}

describe('test derived functions', () => {
  test('that a buy order is a buy order', () => {
    expect(
      isBuyOrder({
        action: 'BUY',
      }),
    ).toBe(true);
    expect(
      isBuyOrder({
        action: 'SELL',
      }),
    ).toBe(false);
  });

  test('tracker percent changed', () => {
    const tracker = {
      prevClose: 10,
      last: 11,
    };

    expect(percentChange(tracker)).toBe(0.1);
  });

  test('tracker percent changed before market open', () => {
    const tracker = {
      prevClose: 0,
      last: 11,
    };

    expect(percentChange(tracker)).toBe(0);
  });

  test('order realized pnl', () => {
    expect(
      orderRealizedPnL({
        executions: {
          '1': {
            realizedPnL: 1,
            commission: 1,
          },
        },
      }),
    ).toBe(1);

    expect(
      orderRealizedPnL({
        executions: {
          '1': {commission: 1},
        },
      }),
    ).toBe(0);

    expect(
      orderRealizedPnL({
        executions: {
          '1': {realizedPnL: 10, commission: 1},
          '2': {realizedPnL: 10, commission: 1},
          '3': {commission: 1},
        },
      }),
    ).toBe(20);
  });

  test('position realized pnl', () => {
    expect(
      positionRealisedPnL({
        orders: [],
      }),
    ).toBe(0);

    expect(
      positionRealisedPnL({
        orders: [
          {
            executions: {
              '1': {
                realizedPnL: 1,
                commission: 1,
              },
            },
          },
        ],
      }),
    ).toBe(1);
  });

  test('position commission', () => {
    expect(
      positionCommission({
        orders: [],
      }),
    ).toBe(0);

    expect(
      positionCommission({
        orders: [
          {
            executions: {
              '1': {
                commission: 1,
              },
            },
          },
        ],
      }),
    ).toBe(1);
  });

  test('position size', () => {
    expect(
      positionSize({
        orders: [],
      }),
    ).toBe(0);

    expect(
      positionSize({
        orders: [
          {
            state: 'FILLED',
            shares: 100,
            action: 'BUY',
          },
        ],
      }),
    ).toBe(100);

    expect(
      positionSize({
        orders: [
          {
            state: 'FILLED',
            shares: 100,
            action: 'BUY',
          },
          {
            state: 'FILLED',
            shares: 100,
            action: 'BUY',
          },
          {
            state: 'FILLED',
            shares: 100,
            action: 'SELL',
          },
        ],
      }),
    ).toBe(200);
  });

  test('a positions action (buy or sell)', () => {
    expect(
      positionAction({
        orders: [
          {
            action: 'BUY',
          },
        ],
      }),
    ).toBe('BUY');

    expect(
      positionAction({
        orders: [
          {
            action: 'SELL',
          },
        ],
      }),
    ).toBe('SELL');

    expect(
      positionAction({
        orders: [],
      }),
    ).toBe('BUY');

    expect(
      positionAction({
        orders: [
          {
            action: 'SELL',
          },
          {
            action: 'BUY',
          },
        ],
      }),
    ).toBe('SELL');
  });

  test('a positions exit action', () => {
    expect(positionExitAction({orders: []})).toBe('SELL');
    expect(
      positionExitAction({
        orders: [
          {
            action: 'BUY',
          },
        ],
      }),
    ).toBe('SELL');
    expect(
      positionExitAction({
        orders: [
          {
            action: 'SELL',
          },
        ],
      }),
    ).toBe('BUY');
  });

  test('that a position with no orders should have a fill price of 0', () => {
    const position = createPosition({
      orders: [
        createOrder({
          state: 'PENDING',
          shares: 100,
          action: 'BUY',
        }),
      ],
    });

    expect(positionFillPrice(position)).toBe(0);
  });

  test('that a position with filled orders but no avgFillPrice returns a fill price of 0', () => {
    const position = createPosition({
      orders: [
        createOrder({
          state: 'FILLED',
          shares: 100,
          action: 'BUY',
          avgFillPrice: undefined,
        }),
      ],
    });

    expect(positionFillPrice(position)).toBe(0);
  });

  test('test that we cacluate the avg fill price for multiple orders', () => {
    const position = createPosition({
      orders: [
        createOrder({
          state: 'FILLED',
          shares: 100,
          action: 'BUY',
          avgFillPrice: 100,
        }),
        createOrder({
          state: 'FILLED',
          shares: 100,
          action: 'BUY',
          avgFillPrice: 200,
        }),
      ],
    });

    expect(positionFillPrice(position)).toBe(150);
  });

  test('test that we cacluate the avg fill price for multiple orders', () => {
    const position = createPosition({
      orders: [
        createOrder({
          state: 'FILLED',
          shares: 100,
          action: 'BUY',
          avgFillPrice: 100,
        }),
        createOrder({
          state: 'FILLED',
          shares: 100,
          action: 'BUY',
          avgFillPrice: 200,
        }),
        createOrder({
          state: 'FILLED',
          shares: 1000,
          action: 'BUY',
          avgFillPrice: 400,
        }),
      ],
    });

    expect(positionFillPrice(position)).toBeCloseTo(358.33);
  });

  test('open profit and loss for a position with one order', () => {
    const position = createPosition({
      orders: [
        createOrder({
          shares: 100,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
      ],
    });

    expect(positionOpenPnL(position, createTracker({last: 100}))).toBe(0);
    expect(positionOpenPnL(position, createTracker({last: 110}))).toBe(1000);
    expect(positionOpenPnL(position, createTracker({last: 90}))).toBe(-1000);
  });

  test('open profit for a position with mutliple orders', () => {
    const position = createPosition({
      orders: [
        createOrder({
          shares: 100,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
        createOrder({
          shares: 100,
          action: 'SELL',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
      ],
    });

    expect(positionOpenPnL(position, createTracker({last: 100}))).toBe(0);
    expect(positionOpenPnL(position, createTracker({last: 110}))).toBe(0);
    expect(positionOpenPnL(position, createTracker({last: 90}))).toBe(0);

    expect(positionPnL(position, createTracker({last: 100}))).toBe(0);
    expect(positionPnL(position, createTracker({last: 110}))).toBe(0);
    expect(positionPnL(position, createTracker({last: 90}))).toBe(0);
  });

  test('open profit for a position with mutliple orders', () => {
    const position = createPosition({
      orders: [
        createOrder({
          shares: 100,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
        createOrder({
          shares: 50,
          action: 'SELL',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
      ],
    });

    expect(positionOpenPnL(position, createTracker({last: 100}))).toBe(0);
    expect(positionOpenPnL(position, createTracker({last: 110}))).toBe(500);
    expect(positionOpenPnL(position, createTracker({last: 90}))).toBe(-500);
  });

  test('position entry price', () => {
    const position = createPosition({
      orders: [
        createOrder({
          shares: 100,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
        createOrder({
          shares: 100,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
        createOrder({
          shares: 50,
          action: 'SELL',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
      ],
    });
    expect(positionEntryPrice(position)).toBe(100);
    expect(positionEntryPrice({orders: []})).toBeNull();
  });

  test('position average entry fill price', () => {
    const position = createPosition({
      orders: [
        createOrder({
          shares: 100,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
        createOrder({
          shares: 150,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 150,
        }),
        createOrder({
          shares: 50,
          action: 'SELL',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
      ],
    });
    expect(positionAvgEntryPrice(position)).toBe(130);
    expect(positionAvgEntryPrice({orders: []})).toBe(0);
  });

  test('position average exit fill price', () => {
    const position = createPosition({
      orders: [
        createOrder({
          shares: 100,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
        createOrder({
          shares: 150,
          action: 'BUY',
          state: 'FILLED',
          avgFillPrice: 150,
        }),
        createOrder({
          shares: 50,
          action: 'SELL',
          state: 'FILLED',
          avgFillPrice: 100,
        }),
      ],
    });
    expect(positionAvgExitPrice(position)).toBe(100);
  });
});
