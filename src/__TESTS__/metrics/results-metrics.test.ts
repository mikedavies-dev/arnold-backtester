import {Position} from '../../backtest/broker';
import {calculateMetrics} from '../../utils/results-metrics';

import {createTestPosition} from '../test-utils/broker';

const accountSize = 1000;
const commissionPerTrade = 1;

describe('test backtest results metrics', () => {
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

  test('calculate metrics for a list of 1 buy position', () => {
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

    const metrics = calculateMetrics(positions, {
      accountSize,
      commissionPerTrade,
    });

    expect(metrics.grossProfit).toBe(1100);
    expect(metrics.netProfit).toBe(1098);
    expect(metrics.positions).toBe(1);
    expect(metrics.orders).toBe(2);
    expect(metrics.commission).toBe(2);
    expect(metrics.longPositions).toBe(1);
    expect(metrics.shortPositions).toBe(0);
  });

  test('calculate metrics for a list of 2 positions', () => {
    const positions: Array<Position> = [
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'SELL',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:31',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ];

    const metrics = calculateMetrics(positions, {
      accountSize,
      commissionPerTrade,
    });

    expect(metrics.grossProfit).toBe(1200);
    expect(metrics.netProfit).toBe(1196);
    expect(metrics.positions).toBe(2);
    expect(metrics.orders).toBe(4);
    expect(metrics.commission).toBe(4);
    expect(metrics.longPositions).toBe(1);
    expect(metrics.shortPositions).toBe(1);
  });

  test('winner count LONG', () => {
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
      createTestPosition({
        time: '09:31',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:32',
        length: 5,
        action: 'BUY',
        winner: false,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ];

    const metrics = calculateMetrics(positions, {
      accountSize,
      commissionPerTrade,
    });

    expect(metrics.longPositions).toBe(3);
    expect(metrics.longWinners).toBe(2);
    expect(metrics.longWinnerPercent).toBeCloseTo(0.6666);

    expect(metrics.shortPositions).toBe(0);
    expect(metrics.shortWinners).toBe(0);
    expect(metrics.shortWinnerPercent).toBeCloseTo(0);
  });

  test('winner count SHORT', () => {
    const positions: Array<Position> = [
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'SELL',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:31',
        length: 5,
        action: 'SELL',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:32',
        length: 5,
        action: 'SELL',
        winner: false,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ];

    const metrics = calculateMetrics(positions, {
      accountSize,
      commissionPerTrade,
    });

    expect(metrics.longPositions).toBe(0);
    expect(metrics.longWinners).toBe(0);
    expect(metrics.longWinnerPercent).toBe(0);

    expect(metrics.shortPositions).toBe(3);
    expect(metrics.shortWinners).toBe(2);
    expect(metrics.shortWinnerPercent).toBeCloseTo(0.6666);
  });

  test('max consecutive wins', () => {
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
      createTestPosition({
        time: '09:31',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:32',
        length: 5,
        action: 'BUY',
        winner: false,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:33',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
    ];

    const metrics = calculateMetrics(positions, {
      accountSize,
      commissionPerTrade,
    });

    expect(metrics.maxConsecutiveWins).toBe(2);
    expect(metrics.maxConsecutiveWinAmount).toBe(200);
  });
});
