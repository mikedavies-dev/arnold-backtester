import {Position} from '../../backtest/broker';
import {calculateMetrics} from '../../utils/results-metrics';

import {createTestPosition} from '../test-utils/broker';

const accountSize = 1000;
const commissionPerTrade = 1;

test('calculate metrics for an empty position list', () => {
  const positions: Array<Position> = [];

  const metrics = calculateMetrics(positions, {
    accountSize,
    commissionPerTrade,
  });

  expect(metrics.grossProfit).toBe(accountSize);
  expect(metrics.netProfit).toBe(accountSize);
  expect(metrics.positions).toBe(0);
  expect(metrics.orders).toBe(0);
  expect(metrics.commission).toBe(0);
});

test('calculate metrics for a list of 1 position', () => {
  const positions: Array<Position> = [
    createTestPosition({
      time: '09:30',
      length: 5,
      action: 'BUY',
      winner: true,
      shares: 100,
      entryPrice: 100,
      profitLossPerShares: 1,
    }),
  ];

  const accountSize = 1000;

  const metrics = calculateMetrics(positions, {
    accountSize,
    commissionPerTrade,
  });

  expect(metrics.grossProfit).toBe(1100);
  expect(metrics.netProfit).toBe(1098);
  expect(metrics.positions).toBe(1);
  expect(metrics.orders).toBe(2);
  expect(metrics.commission).toBe(2);
});
