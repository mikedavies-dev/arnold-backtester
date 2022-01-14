import {createTimeAsDate} from '../test-utils/tick';

import {initBroker, placeOrder} from '../../backtest/broker';

test('init positions function returns an empty positions ds', () => {
  const state = initBroker({getMarketTime: () => createTimeAsDate('09:30')});

  expect(state).toMatchInlineSnapshot(`
    Object {
      "getMarketTime": [Function],
      "nextOrderId": 1,
      "openOrders": Object {},
      "openPositions": Object {},
      "orders": Array [],
      "positions": Array [],
    }
  `);
});

test('place a market order and confirm it is pending', () => {
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
