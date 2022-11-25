import {getPositionPL, totalOrderValue} from '../../utils/results-metrics';

import {createTestPosition} from '../test-utils/broker';

test('order value for non-filled order', () => {
  expect(totalOrderValue([])).toBe(0);
});

test('order value for non-filled order', () => {
  expect(
    totalOrderValue([
      {
        id: 1,
        type: 'MKT',
        action: 'BUY',
        shares: 100,
        remaining: 100,
        openedAt: new Date(),
        symbol: 'ZZZZ',
        state: 'PENDING',
        executions: {},
      },
    ]),
  ).toBe(0);
});

test('calculate pnl for a winning buy position', () => {
  expect(
    getPositionPL(
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ),
  ).toBe(100);
});

test('calculate pnl for a winning sell position', () => {
  expect(
    getPositionPL(
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'SELL',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ),
  ).toBe(100);
});

test('calculate pnl for a loosing buy position', () => {
  expect(
    getPositionPL(
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'BUY',
        winner: false,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ),
  ).toBe(-100);
});

test('calculate pnl for a loosing sell position', () => {
  expect(
    getPositionPL(
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'SELL',
        winner: false,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ),
  ).toBe(-100);
});
