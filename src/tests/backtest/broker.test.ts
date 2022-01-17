import {
  createTimeAsDate,
  createMarket,
  updateMarketDataAndBroker,
} from '../test-utils/tick';

import {
  initBroker,
  placeOrder,
  hasOpenOrders,
  getPositionSize,
} from '../../backtest/broker';

test('init positions function returns an empty positions ds', () => {
  const state = initBroker({getMarketTime: () => createTimeAsDate('09:30')});

  expect(state).toMatchInlineSnapshot(`
    Object {
      "getMarketTime": [Function],
      "nextOrderId": 1,
      "openOrders": Object {},
      "openPositions": Object {},
      "orderExecutionDelayMs": 1000,
      "orders": Array [],
      "positions": Array [],
    }
  `);
});

test('placing a market order and confirm it is pending', () => {
  const state = initBroker({getMarketTime: () => createTimeAsDate('09:30')});
  const orderId = placeOrder(state, {
    symbol: 'ZZZZ',
    shares: 10,
    action: 'BUY',
    type: 'MKT',
  });

  expect(orderId).toBe(1);

  expect(state).toMatchInlineSnapshot(`
    Object {
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
      "orderExecutionDelayMs": 1000,
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

test('placing market buy order and wait for it to be filled', () => {
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
      "fillPrice": 1.3,
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
