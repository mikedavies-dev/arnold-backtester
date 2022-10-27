import {
  createTimeAsDate,
  createMarket,
  updateMarketDataAndBroker,
  offsetMarketUpdate,
} from '../test-utils/tick';

import {
  initBroker,
  placeOrder,
  hasOpenOrders,
  getPositionSize,
  closePosition,
  closeOrder,
  closeOpenOrders,
} from '../../backtest/broker';

test('init positions function returns an empty positions ds', () => {
  const state = initBroker({
    initialBalance: 1000,
    getMarketTime: () => createTimeAsDate('09:30'),
  });

  expect(state).toMatchInlineSnapshot(`
    Object {
      "balance": 1000,
      "getMarketTime": [Function],
      "nextOrderId": 1,
      "openOrders": Object {},
      "openPositions": Object {},
      "orders": Array [],
      "positions": Array [],
    }
  `);
});

test('placing a market order and confirm it is pending', () => {
  const state = initBroker({
    initialBalance: 1000,
    getMarketTime: () => createTimeAsDate('09:30'),
  });
  const orderId = placeOrder(state, {
    symbol: 'ZZZZ',
    shares: 10,
    action: 'BUY',
    type: 'MKT',
  });

  expect(orderId).toBe(1);

  expect(state).toMatchInlineSnapshot(`
    Object {
      "balance": 1000,
      "getMarketTime": [Function],
      "nextOrderId": 2,
      "openOrders": Object {
        "1": Object {
          "action": "BUY",
          "id": 1,
          "openedAt": 2022-01-01T14:30:00.000Z,
          "shares": 10,
          "state": "PENDING",
          "symbol": "ZZZZ",
          "type": "MKT",
        },
      },
      "openPositions": Object {
        "ZZZZ": Object {
          "closeReason": null,
          "data": Object {},
          "isClosing": false,
          "orders": Array [
            Object {
              "action": "BUY",
              "id": 1,
              "openedAt": 2022-01-01T14:30:00.000Z,
              "shares": 10,
              "state": "PENDING",
              "symbol": "ZZZZ",
              "type": "MKT",
            },
          ],
          "size": 0,
          "symbol": "ZZZZ",
        },
      },
      "orders": Array [
        Object {
          "action": "BUY",
          "id": 1,
          "openedAt": 2022-01-01T14:30:00.000Z,
          "shares": 10,
          "state": "PENDING",
          "symbol": "ZZZZ",
          "type": "MKT",
        },
      ],
      "positions": Array [
        Object {
          "closeReason": null,
          "data": Object {},
          "isClosing": false,
          "orders": Array [
            Object {
              "action": "BUY",
              "id": 1,
              "openedAt": 2022-01-01T14:30:00.000Z,
              "shares": 10,
              "state": "PENDING",
              "symbol": "ZZZZ",
              "type": "MKT",
            },
          ],
          "size": 0,
          "symbol": "ZZZZ",
        },
      ],
    }
  `);
});

test('that updating market data without any ticks fails', () => {
  const market = createMarket([['09:30:00', 1, 1.2, 1.1, 0]]);
  expect(() => updateMarketDataAndBroker(market, [])).toThrow();
});

test('that updating market data without any ticks fails', () => {
  expect(() => createMarket([])).toThrow();
});

test('placing market buy order and wait for it to be filled at the ask', () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, {
    type: 'MKT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
  });

  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 100,
      "state": "PENDING",
      "symbol": "AAAA",
      "type": "MKT",
    }
  `);

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Move the market along
  updateMarketDataAndBroker(market, [['09:30:02', 1.1, 1.3, 1.2, 0]]);

  // The order should now be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);

  // And have no more open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  // We should have been filled at the ask
  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "avgFillPrice": 1.3,
      "filledAt": 2022-01-01T14:30:02.000Z,
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 100,
      "state": "FILLED",
      "symbol": "AAAA",
      "type": "MKT",
    }
  `);
});

test('placing market sell order and wait for it to be filled at the bid', () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, {
    type: 'MKT',
    action: 'SELL',
    symbol: market.symbol,
    shares,
  });

  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "SELL",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 100,
      "state": "PENDING",
      "symbol": "AAAA",
      "type": "MKT",
    }
  `);

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Move the market along
  updateMarketDataAndBroker(market, [['09:30:02', 1.1, 1.3, 1.2, 0]]);

  // The order should now be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -1);

  // And have no more open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  // We should have been filled at the ask
  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "SELL",
      "avgFillPrice": 1.1,
      "filledAt": 2022-01-01T14:30:02.000Z,
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 100,
      "state": "FILLED",
      "symbol": "AAAA",
      "type": "MKT",
    }
  `);
});

test(`place market buy order that won't be filled`, () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, {
    type: 'MKT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
  });

  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 100,
      "state": "PENDING",
      "symbol": "AAAA",
      "type": "MKT",
    }
  `);

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Move the market along
  updateMarketDataAndBroker(market, [['09:30:00', 1.1, 1.3, 1.2, 0]]);

  // The order should still be pending
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // We should not been filled
  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 100,
      "state": "PENDING",
      "symbol": "AAAA",
      "type": "MKT",
    }
  `);
});

test('place limit BUY order that gets filled', () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, {
    type: 'LMT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
    price: 1.3,
  });

  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "price": 1.3,
      "shares": 100,
      "state": "PENDING",
      "symbol": "AAAA",
      "type": "LMT",
    }
  `);

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  updateMarketDataAndBroker(market, [['09:30:00', 1.1, 1.3, 1.2, 0]]);

  // The order should not be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Ask is <= price so it can be filled
  updateMarketDataAndBroker(market, [['09:30:01', 1.1, 1.3, 1.2, 0]]);

  // The order should have been filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  // We should have been filled at the ask
  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "avgFillPrice": 1.3,
      "filledAt": 2022-01-01T14:30:01.000Z,
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "price": 1.3,
      "shares": 100,
      "state": "FILLED",
      "symbol": "AAAA",
      "type": "LMT",
    }
  `);
});

test('place limit SELL order that gets filled', () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, {
    type: 'LMT',
    action: 'SELL',
    symbol: market.symbol,
    shares,
    price: 1.1,
  });

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  updateMarketDataAndBroker(market, [['09:30:00', 1.1, 1.3, 1.2, 0]]);

  // The order should not be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Ask is <= price so it can be filled
  updateMarketDataAndBroker(market, [['09:30:01', 1.1, 1.3, 1.2, 0]]);

  // The order should have been filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -1);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  // We should have been filled at the ask
  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "SELL",
      "avgFillPrice": 1.1,
      "filledAt": 2022-01-01T14:30:01.000Z,
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "price": 1.1,
      "shares": 100,
      "state": "FILLED",
      "symbol": "AAAA",
      "type": "LMT",
    }
  `);
});

test('place limit order that does not get filled', () => {
  const shares = 100;
  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, {
    type: 'LMT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
    price: 1.3,
  });

  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "price": 1.3,
      "shares": 100,
      "state": "PENDING",
      "symbol": "AAAA",
      "type": "LMT",
    }
  `);

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  updateMarketDataAndBroker(market, [['09:30:00', 1.1, 1.3, 1.2, 0]]);

  // The order should not be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Ask is > price so it won't be filled
  updateMarketDataAndBroker(market, [['09:30:01', 1.1, 1.4, 1.2, 0]]);

  // The order should have been filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // We should have been filled at the ask
  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "price": 1.3,
      "shares": 100,
      "state": "PENDING",
      "symbol": "AAAA",
      "type": "LMT",
    }
  `);
});

test('fill a trailing stop buy order', () => {
  const shares = 100;
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  placeOrder(market.broker, {
    type: 'TRAIL',
    action: 'BUY',
    symbol: market.symbol,
    shares,
    price: 0.1,
  });

  // Set the start price
  offsetMarketUpdate(market, 0.9);

  offsetMarketUpdate(market, 0.8);
  offsetMarketUpdate(market, 0.7);
  offsetMarketUpdate(market, 0.6);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  offsetMarketUpdate(market, 0.5);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);

  offsetMarketUpdate(market, 0.51);
  offsetMarketUpdate(market, 0.52);
  offsetMarketUpdate(market, 0.53);
  offsetMarketUpdate(market, 0.54);
  offsetMarketUpdate(market, 0.55);
  offsetMarketUpdate(market, 0.56);
  offsetMarketUpdate(market, 0.57);
  offsetMarketUpdate(market, 0.58);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);

  offsetMarketUpdate(market, 0.59);
  offsetMarketUpdate(market, 0.6);
  offsetMarketUpdate(market, 0.61);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);

  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "BUY",
        "avgFillPrice": 0.65,
        "filledAt": 2022-01-01T14:30:15.000Z,
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "price": 0.1,
        "shares": 100,
        "state": "FILLED",
        "symbol": "AAAA",
        "triggerPrice": 0.6,
        "type": "TRAIL",
      },
    ]
  `);
});

test('fill a trailing stop sell order', () => {
  const shares = 100;
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  placeOrder(market.broker, {
    type: 'TRAIL',
    action: 'SELL',
    symbol: market.symbol,
    shares,
    price: 0.1,
  });

  // Set the start price
  offsetMarketUpdate(market, 1.1);
  offsetMarketUpdate(market, 1.2);
  offsetMarketUpdate(market, 1.3);
  offsetMarketUpdate(market, 1.4);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  offsetMarketUpdate(market, 1.5);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);

  offsetMarketUpdate(market, 1.49);
  offsetMarketUpdate(market, 1.48);
  offsetMarketUpdate(market, 1.47);
  offsetMarketUpdate(market, 1.46);
  offsetMarketUpdate(market, 1.45);
  offsetMarketUpdate(market, 1.44);
  offsetMarketUpdate(market, 1.43);
  offsetMarketUpdate(market, 1.42);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);

  offsetMarketUpdate(market, 1.41);
  offsetMarketUpdate(market, 1.4);
  offsetMarketUpdate(market, 1.39);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -1);

  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "SELL",
        "avgFillPrice": 1.3499999999999999,
        "filledAt": 2022-01-01T14:30:15.000Z,
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "price": 0.1,
        "shares": 100,
        "state": "FILLED",
        "symbol": "AAAA",
        "triggerPrice": 1.4,
        "type": "TRAIL",
      },
    ]
  `);
});

test('close all open positions with closePosition', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, {
    type: 'MKT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
  });

  offsetMarketUpdate(market, 1.1);

  // The order should have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);

  // Place a second order
  placeOrder(market.broker, {
    type: 'MKT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
  });

  // The second order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);

  offsetMarketUpdate(market, 1.2);

  // The order should now have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * 2);

  offsetMarketUpdate(market, 1.3);
  offsetMarketUpdate(market, 1.4);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * 2);

  // close the position
  closePosition(market.broker, market.symbol);
  offsetMarketUpdate(market, 1.5);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);

  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "BUY",
        "avgFillPrice": 1.1500000000000001,
        "filledAt": 2022-01-01T14:30:01.000Z,
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "shares": 100,
        "state": "FILLED",
        "symbol": "AAAA",
        "type": "MKT",
      },
      Object {
        "action": "BUY",
        "avgFillPrice": 1.25,
        "filledAt": 2022-01-01T14:30:02.000Z,
        "id": 2,
        "openedAt": 2022-01-01T14:30:01.000Z,
        "shares": 100,
        "state": "FILLED",
        "symbol": "AAAA",
        "type": "MKT",
      },
      Object {
        "action": "SELL",
        "avgFillPrice": 1.45,
        "filledAt": 2022-01-01T14:30:05.000Z,
        "id": 3,
        "openedAt": 2022-01-01T14:30:04.000Z,
        "shares": 200,
        "state": "FILLED",
        "symbol": "AAAA",
        "type": "MKT",
      },
    ]
  `);
});

test('close all open positions with closePosition (sell)', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, {
    type: 'MKT',
    action: 'SELL',
    symbol: market.symbol,
    shares,
  });

  offsetMarketUpdate(market, 1.1);

  // The order should have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -1);

  // Place a second order
  placeOrder(market.broker, {
    type: 'MKT',
    action: 'SELL',
    symbol: market.symbol,
    shares,
  });

  // The second order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -1);

  offsetMarketUpdate(market, 1.2);

  // The order should now have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -2);

  offsetMarketUpdate(market, 1.3);
  offsetMarketUpdate(market, 1.4);

  // The order should not have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -2);

  // close the position
  closePosition(market.broker, market.symbol);
  offsetMarketUpdate(market, 1.5);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
});

test('cancelling an open order', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  const orderId = placeOrder(market.broker, {
    type: 'TRAIL',
    shares,
    action: 'BUY',
    symbol: market.symbol,
    price: 0.1,
  });

  offsetMarketUpdate(market, 1);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  closeOrder(market.broker, orderId);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "BUY",
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "price": 0.1,
        "shares": 100,
        "state": "CANCELLED",
        "symbol": "AAAA",
        "triggerPrice": 1.1,
        "type": "TRAIL",
      },
    ]
  `);
});

test('attempting to cancel an invalid order', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, {
    type: 'TRAIL',
    shares,
    action: 'BUY',
    symbol: market.symbol,
    price: 0.1,
  });

  offsetMarketUpdate(market, 1);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  closeOrder(market.broker, 1234);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // The original order is still pending
  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "BUY",
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "price": 0.1,
        "shares": 100,
        "state": "PENDING",
        "symbol": "AAAA",
        "triggerPrice": 1.1,
        "type": "TRAIL",
      },
    ]
  `);
});

test('cancelling an open order', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, {
    type: 'TRAIL',
    shares,
    action: 'BUY',
    symbol: market.symbol,
    price: 0.1,
  });

  offsetMarketUpdate(market, 1);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  closeOpenOrders(market.broker);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "BUY",
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "price": 0.1,
        "shares": 100,
        "state": "CANCELLED",
        "symbol": "AAAA",
        "triggerPrice": 1.1,
        "type": "TRAIL",
      },
    ]
  `);
});

test('fill a child order once a parent order has been filled', () => {
  const market = createMarket([['09:30:00', 1, 1, 1, 0]]);
  const shares = 100;

  const orderId1 = placeOrder(market.broker, {
    symbol: market.symbol,
    type: 'LMT',
    action: 'BUY',
    price: 1.1,
    shares,
  });

  // Place the trailing stop
  placeOrder(market.broker, {
    symbol: market.symbol,
    type: 'TRAIL',
    action: 'SELL',
    price: 0.1,
    shares,
    parentId: orderId1,
  });

  // We should have a PENDING and ACCEPTED order
  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "BUY",
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "price": 1.1,
        "shares": 100,
        "state": "PENDING",
        "symbol": "AAAA",
        "type": "LMT",
      },
      Object {
        "action": "SELL",
        "id": 2,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "parentId": 1,
        "price": 0.1,
        "shares": 100,
        "state": "ACCEPTED",
        "symbol": "AAAA",
        "type": "TRAIL",
      },
    ]
  `);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  const [order1, order2] = market.broker.orders;

  // Move the market
  offsetMarketUpdate(market, 1.1);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Order 1 gets filled
  offsetMarketUpdate(market, 1.0);
  expect(order1.avgFillPrice).not.toBeNull();
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);

  // Price goes up
  offsetMarketUpdate(market, 1.1);
  offsetMarketUpdate(market, 1.2);
  offsetMarketUpdate(market, 1.3);
  offsetMarketUpdate(market, 1.4);

  expect(order2.state).toBe('PENDING');
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Price comes down again
  offsetMarketUpdate(market, 1.3);
  offsetMarketUpdate(market, 1.2);
  offsetMarketUpdate(market, 1.1);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);

  expect(market.broker.orders).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": "BUY",
        "avgFillPrice": 1.05,
        "filledAt": 2022-01-01T14:30:02.000Z,
        "id": 1,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "price": 1.1,
        "shares": 100,
        "state": "FILLED",
        "symbol": "AAAA",
        "type": "LMT",
      },
      Object {
        "action": "SELL",
        "avgFillPrice": 1.15,
        "filledAt": 2022-01-01T14:30:08.000Z,
        "id": 2,
        "openedAt": 2022-01-01T14:30:00.000Z,
        "parentId": 1,
        "price": 0.1,
        "shares": 100,
        "state": "FILLED",
        "symbol": "AAAA",
        "triggerPrice": 1.2999999999999998,
        "type": "TRAIL",
      },
    ]
  `);
});

test(`cancel a child order with it's parent order`, () => {
  const market = createMarket([['09:30:00', 1, 1, 1, 0]]);
  const shares = 100;

  const orderId1 = placeOrder(market.broker, {
    symbol: market.symbol,
    type: 'LMT',
    action: 'BUY',
    price: 1.1,
    shares,
  });

  // Place the trailing stop
  placeOrder(market.broker, {
    symbol: market.symbol,
    type: 'TRAIL',
    action: 'SELL',
    price: 0.1,
    shares,
    parentId: orderId1,
  });

  closeOrder(market.broker, orderId1);

  // Both orders have been cancelled
  expect(market.broker.orders[0].state).toMatchInlineSnapshot(`"CANCELLED"`);
  expect(market.broker.orders[1].state).toMatchInlineSnapshot(`"CANCELLED"`);
});

test('creating a position then closing it', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);
  const shares = 100;

  placeOrder(market.broker, {
    type: 'MKT',
    shares,
    symbol: market.symbol,
    action: 'BUY',
  });

  offsetMarketUpdate(market, 0.9);

  const [position] = market.broker.positions;

  expect(position).toMatchInlineSnapshot(`
    Object {
      "closeReason": null,
      "data": Object {},
      "isClosing": false,
      "orders": Array [
        Object {
          "action": "BUY",
          "avgFillPrice": 0.9500000000000001,
          "filledAt": 2022-01-01T14:30:01.000Z,
          "id": 1,
          "openedAt": 2022-01-01T14:30:00.000Z,
          "shares": 100,
          "state": "FILLED",
          "symbol": "AAAA",
          "type": "MKT",
        },
      ],
      "size": 100,
      "symbol": "AAAA",
    }
  `);

  placeOrder(market.broker, {
    type: 'MKT',
    shares,
    symbol: market.symbol,
    action: 'SELL',
  });

  offsetMarketUpdate(market, 0.9);

  expect(position.orders.length).toBe(2);
  expect(market.broker.openPositions[market.symbol]).toBeFalsy();
});

test('closePosition should close pending orders', () => {
  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);
  const shares = 100;

  const orderId = placeOrder(market.broker, {
    type: 'MKT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
  });

  expect(orderId).toBeGreaterThan(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Close the position
  closePosition(market.broker, market.symbol);

  // Make sure it closed the position
  expect(market.broker.openPositions).toMatchInlineSnapshot(`Object {}`);

  // Check the position
  expect(market.broker.positions).toMatchInlineSnapshot(`
    Array [
      Object {
        "closeReason": null,
        "data": Object {},
        "isClosing": true,
        "orders": Array [
          Object {
            "action": "BUY",
            "id": 1,
            "openedAt": 2022-01-01T14:30:00.000Z,
            "shares": 100,
            "state": "CANCELLED",
            "symbol": "AAAA",
            "type": "MKT",
          },
        ],
        "size": 0,
        "symbol": "AAAA",
      },
    ]
  `);

  // Make sure it closed the orders
  expect(market.broker.orders[0]).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 100,
      "state": "CANCELLED",
      "symbol": "AAAA",
      "type": "MKT",
    }
  `);
});

test('closePosition should close pending orders', () => {
  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);
  const shares = 100;

  const orderId = placeOrder(market.broker, {
    type: 'MKT',
    action: 'BUY',
    symbol: market.symbol,
    shares,
  });

  expect(orderId).toBeGreaterThan(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Close the position
  closePosition(market.broker, market.symbol, 'Test Reason 1');

  // Close again with a different reason
  closePosition(market.broker, market.symbol, 'Test Reason 2');

  // Make sure it closed the position
  expect(market.broker.openPositions).toMatchInlineSnapshot(`Object {}`);

  // The close reason should be the same as the first
  expect(market.broker.positions[0].closeReason).toMatchInlineSnapshot(
    `"Test Reason 1"`,
  );
});

test(`placing a BUY stop order`, () => {
  const market = createMarket([['09:30:00', 0.9, 1.1, 1, 0]]);
  const shares = 100;

  placeOrder(market.broker, {
    type: 'STP',
    action: 'BUY',
    shares,
    symbol: market.symbol,
    price: 1.3,
  });

  // Order should be pending
  expect(market.broker.orders[0].state).toBe('PENDING');

  // Step 1
  offsetMarketUpdate(market, 1.1);
  expect(market.broker.orders[0].state).toBe('PENDING');

  // Step 2
  offsetMarketUpdate(market, 1.2);
  expect(market.broker.orders[0].state).toBe('PENDING');

  // Step 3
  offsetMarketUpdate(market, 1.3);
  expect(market.broker.orders[0].state).toBe('FILLED');
});

test(`placing a SELL stop order`, () => {
  const market = createMarket([['09:30:00', 0.9, 1.1, 1, 0]]);
  const shares = 100;

  placeOrder(market.broker, {
    type: 'STP',
    action: 'SELL',
    shares,
    symbol: market.symbol,
    price: 0.7,
  });

  // Order should be pending
  expect(market.broker.orders[0].state).toBe('PENDING');

  // Step 1
  offsetMarketUpdate(market, 0.9);
  expect(market.broker.orders[0].state).toBe('PENDING');

  // Step 2
  offsetMarketUpdate(market, 0.8);
  expect(market.broker.orders[0].state).toBe('PENDING');

  // Step 3
  offsetMarketUpdate(market, 0.7);
  expect(market.broker.orders[0].state).toBe('FILLED');
});
