import {positionDirection} from '../../utils/derived';

import {createTestPosition} from '../testing/broker';
import {getTestDate} from '../testing/tick';

test('check the direction of a buy order', () => {
  expect(
    positionDirection(
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
  ).toBe('LONG');
});

test('check the direction of a sell order', () => {
  expect(
    positionDirection(
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
  ).toBe('SHORT');
});

test('check the direction of a position without orders', () => {
  expect(
    positionDirection({
      symbol: 'ZZZZ',
      orders: [],
      size: 0,
      openedAt: getTestDate(),
      closedAt: null,
      closeReason: null,
      isClosing: false,
      data: null,
    }),
  ).toBe('LONG');
});
