import {createTimeAsDate} from '../test-utils/tick';

import {initBroker, placeOrder} from '../../backtest/broker';

test('init positions function returns an empty positions ds', () => {
  const state = initBroker({getMarketTime: () => createTimeAsDate('09:30')});

  expect(state).toMatchInlineSnapshot(`
    Object {
      "getMarketTime": [Function],
      "nextOrderId": 0,
      "openOrders": Object {},
      "openPositions": Object {},
      "orders": Array [],
      "positions": Array [],
    }
  `);
});

test('place a market order and confirm it is pending', () => {
  const {state, order} = placeOrder(
    initBroker({getMarketTime: () => createTimeAsDate('09:30')}),
    {
      symbol: 'ZZZZ',
      shares: 10,
      action: 'BUY',
      type: 'MKT',
    },
  );

  expect(state).toMatchInlineSnapshot(`
    Object {
      "getMarketTime": [Function],
      "nextOrderId": 1,
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
      "openPositions": Object {},
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
      "positions": Array [],
    }
  `);

  expect(order).toMatchInlineSnapshot(`
    Object {
      "action": "BUY",
      "id": 1,
      "openedAt": 2022-01-01T14:30:00.000Z,
      "shares": 10,
      "state": "PENDING",
      "symbol": "ZZZZ",
      "type": "MKT",
    }
  `);
});
