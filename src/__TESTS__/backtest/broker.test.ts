import {
  createTimeAsDate,
  createMarket,
  updateMarketDataAndBroker,
  offsetMarketUpdate,
} from '../testing/tick';

import {
  initBroker,
  placeOrder,
  hasOpenOrders,
  getPositionSize,
  closePosition,
  closeOrder,
  closeOpenOrders,
  hasOpenPosition,
  getOpenPosition,
} from '../../backtest/broker';

test('init positions function returns an empty positions ds', () => {
  const state = initBroker({
    initialBalance: 1000,
    getMarketTime: () => createTimeAsDate('09:30'),
  });

  expect(state).toMatchInlineSnapshot(`
    {
      "balance": 1000,
      "getMarketTime": [Function],
      "nextOrderId": 1,
      "openOrders": {},
      "openPositions": {},
      "orders": [],
      "positions": [],
    }
  `);
});

test('placing a market order and confirm it is pending', () => {
  const state = initBroker({
    initialBalance: 1000,
    getMarketTime: () => createTimeAsDate('09:30'),
  });
  const orderId = placeOrder(state, 'ZZZZ', {
    shares: 10,
    action: 'BUY',
    type: 'MKT',
  });

  expect(orderId).toBe(1);

  expect(state.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );
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

  expect(hasOpenPosition(market.broker, market.symbol)).toBe(false);

  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'BUY',
    shares,
  });

  expect(market.broker.orders[0].state).toEqual('PENDING');

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  expect(hasOpenPosition(market.broker, market.symbol)).toBe(true);

  const openPosition = getOpenPosition(market.broker, market.symbol);
  expect(openPosition?.symbol).toEqual(market.symbol);

  const unknownPosition = getOpenPosition(market.broker, 'INVALID_SYMBOL');
  expect(unknownPosition).toBeNull();

  // Move the market along
  updateMarketDataAndBroker(market, [['09:30:02', 1.1, 1.3, 1.2, 0]]);

  // The order should now be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);

  // And have no more open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(market.broker.orders[0].avgFillPrice).toEqual(1.3);
});

test('placing market sell order and wait for it to be filled at the bid', () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'SELL',
    shares,
  });

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Move the market along
  updateMarketDataAndBroker(market, [['09:30:02', 1.1, 1.3, 1.2, 0]]);

  // The order should now be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -1);

  // And have no more open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  // We should have been filled at the ask
  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'FILLED',
      avgFillPrice: 1.1,
    }),
  );
});

test(`place market buy order that won't be filled`, () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'BUY',
    shares,
  });

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Move the market along
  updateMarketDataAndBroker(market, [['09:30:00', 1.1, 1.3, 1.2, 0]]);

  // The order should still be pending
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // We should not been filled
  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );
});

test('place limit BUY order that gets filled', () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, market.symbol, {
    type: 'LMT',
    action: 'BUY',
    shares,
    price: 1.3,
  });

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );

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
  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'FILLED',
      avgFillPrice: 1.3,
    }),
  );
});

test('place limit SELL order that gets filled', () => {
  const shares = 100;

  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, market.symbol, {
    type: 'LMT',
    action: 'SELL',
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
  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'FILLED',
      avgFillPrice: 1.1,
    }),
  );
});

test('place limit order that does not get filled', () => {
  const shares = 100;
  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);

  placeOrder(market.broker, market.symbol, {
    type: 'LMT',
    action: 'BUY',
    shares,
    price: 1.3,
  });

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );

  // Make sure we have open orders
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  updateMarketDataAndBroker(market, [['09:30:00', 1.1, 1.3, 1.2, 0]]);

  // The order should not be filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Ask is > price so it won't be filled
  updateMarketDataAndBroker(market, [['09:30:01', 1.1, 1.4, 1.2, 0]]);

  // The order should not have been filled
  expect(getPositionSize(market.broker, market.symbol)).toEqual(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );
});

test('fill a trailing stop buy order', () => {
  const shares = 100;
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  placeOrder(market.broker, market.symbol, {
    type: 'TRAIL',
    action: 'BUY',
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

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'FILLED',
      avgFillPrice: 0.65,
    }),
  );
});

test('fill a trailing stop sell order', () => {
  const shares = 100;
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  placeOrder(market.broker, market.symbol, {
    type: 'TRAIL',
    action: 'SELL',

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

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'FILLED',
      avgFillPrice: 1.3499999999999999,
    }),
  );
});

test('close all open positions with closePosition', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'BUY',

    shares,
  });

  offsetMarketUpdate(market, 1.1);

  // The order should have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares);

  // Place a second order
  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'BUY',

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
});

test('close all open positions with closePosition (sell)', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'SELL',

    shares,
  });

  offsetMarketUpdate(market, 1.1);

  // The order should have been filed
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);
  expect(getPositionSize(market.broker, market.symbol)).toEqual(shares * -1);

  // Place a second order
  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'SELL',
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

  const orderId = placeOrder(market.broker, market.symbol, {
    type: 'TRAIL',
    shares,
    action: 'BUY',
    price: 0.1,
  });

  offsetMarketUpdate(market, 1);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  closeOrder(market.broker, orderId);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'CANCELLED',
    }),
  );
});

test('attempting to cancel an invalid order', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, market.symbol, {
    type: 'TRAIL',
    shares,
    action: 'BUY',
    price: 0.1,
  });

  offsetMarketUpdate(market, 1);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  closeOrder(market.broker, 1234);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // The original order is still pending
  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );
});

test('cancelling an open order', () => {
  const market = createMarket([['09:30:00', 1, 2, 1, 0]]);

  const shares = 100;

  placeOrder(market.broker, market.symbol, {
    type: 'TRAIL',
    shares,
    action: 'BUY',
    price: 0.1,
  });

  offsetMarketUpdate(market, 1);

  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);
  closeOpenOrders(market.broker);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(false);

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'CANCELLED',
    }),
  );
});

test('fill a child order once a parent order has been filled', () => {
  const market = createMarket([['09:30:00', 1, 1, 1, 0]]);
  const shares = 100;

  const orderId1 = placeOrder(market.broker, market.symbol, {
    type: 'LMT',
    action: 'BUY',
    price: 1.1,
    shares,
  });

  // Place the trailing stop
  placeOrder(market.broker, market.symbol, {
    type: 'TRAIL',
    action: 'SELL',
    price: 0.1,
    shares,
    parentId: orderId1,
  });

  expect(market.broker.orders[0]).toEqual(
    expect.objectContaining({
      state: 'PENDING',
    }),
  );

  expect(market.broker.orders[1]).toEqual(
    expect.objectContaining({
      state: 'ACCEPTED',
    }),
  );

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
});

test(`cancel a child order with it's parent order`, () => {
  const market = createMarket([['09:30:00', 1, 1, 1, 0]]);
  const shares = 100;

  const orderId1 = placeOrder(market.broker, market.symbol, {
    type: 'LMT',
    action: 'BUY',
    price: 1.1,
    shares,
  });

  // Place the trailing stop
  placeOrder(market.broker, market.symbol, {
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

  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    shares,
    action: 'BUY',
  });

  offsetMarketUpdate(market, 0.9);

  const [position] = market.broker.positions;

  placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    shares,
    action: 'SELL',
  });

  offsetMarketUpdate(market, 0.9);

  expect(position.orders.length).toBe(2);
  expect(market.broker.openPositions[market.symbol]).toBeFalsy();
});

test('closePosition should close pending orders', () => {
  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);
  const shares = 100;

  const orderId = placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'BUY',
    shares,
  });

  expect(orderId).toBeGreaterThan(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Close the position
  closePosition(market.broker, market.symbol);

  // Make sure it closed the position
  expect(market.broker.openPositions).toMatchInlineSnapshot(`{}`);
});

test('closePosition should close pending orders', () => {
  const market = createMarket([['09:30:00', 1.1, 1.2, 1.1, 0]]);
  const shares = 100;

  const orderId = placeOrder(market.broker, market.symbol, {
    type: 'MKT',
    action: 'BUY',
    shares,
  });

  expect(orderId).toBeGreaterThan(0);
  expect(hasOpenOrders(market.broker, market.symbol)).toBe(true);

  // Close the position
  closePosition(market.broker, market.symbol, 'Test Reason 1');

  // Close again with a different reason
  closePosition(market.broker, market.symbol, 'Test Reason 2');

  // Make sure it closed the position
  expect(market.broker.openPositions).toMatchInlineSnapshot(`{}`);

  // The close reason should be the same as the first
  expect(market.broker.positions[0].closeReason).toMatchInlineSnapshot(
    `"Test Reason 1"`,
  );
});

test(`placing a BUY stop order`, () => {
  const market = createMarket([['09:30:00', 0.9, 1.1, 1, 0]]);
  const shares = 100;

  placeOrder(market.broker, market.symbol, {
    type: 'STP',
    action: 'BUY',
    shares,
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

  placeOrder(market.broker, market.symbol, {
    type: 'STP',
    action: 'SELL',
    shares,
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
