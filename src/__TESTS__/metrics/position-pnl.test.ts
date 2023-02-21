import {positionRealisedPnL} from '../../utils/derived';

import {createTestPosition} from '../testing/broker';

test('calculate pnl for a winning buy position', () => {
  expect(
    positionRealisedPnL(
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
    positionRealisedPnL(
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
    positionRealisedPnL(
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
    positionRealisedPnL(
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
