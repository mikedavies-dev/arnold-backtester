import {Position} from '../../backtest/broker';
import {
  calculateMetrics,
  updatePeriodMetrics,
  MetricsByPeriod,
  PositionDirection,
} from '../../utils/results-metrics';

import {createTestPosition} from '../test-utils/broker';

const accountSize = 1000;
const commissionPerOrder = 1;

function createAndUpdatePeriodMetrics(
  data: Partial<MetricsByPeriod>,
  {
    orderCount = 0,
    positionPnL = 0,
    commissionPerOrder = 0,
    direction = 'LONG',
  }: {
    orderCount?: number;
    positionPnL?: number;
    commissionPerOrder?: number;
    direction?: PositionDirection;
  } = {},
): MetricsByPeriod {
  return updatePeriodMetrics(
    {
      orders: 0,
      positions: 0,
      longPositions: 0,
      longWinners: 0,
      shortPositions: 0,
      shortWinners: 0,
      longWinnerPercent: 0,
      shortWinnerPercent: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      commission: 0,
      grossProfitAndLoss: 0,
      netProfitAndLoss: 0,
      ...data,
    },
    {
      orderCount,
      positionPnL,
      commissionPerOrder,
      direction,
    },
  );
}

describe('test backtest results metrics', () => {
  test('calculate metrics for an empty position list', () => {
    const positions: Array<Position> = [];

    const metrics = calculateMetrics(positions, {
      accountSize,
      commissionPerOrder,
    });

    expect(metrics.grossProfitAndLoss).toBe(0);
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
      commissionPerOrder,
    });

    expect(metrics.grossProfitAndLoss).toBe(100);
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
      commissionPerOrder,
    });

    expect(metrics.grossProfitAndLoss).toBe(200);
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
      commissionPerOrder,
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
      commissionPerOrder,
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
      commissionPerOrder,
    });

    expect(metrics.maxConsecutiveWins).toBe(2);
    expect(metrics.maxConsecutiveWinAmount).toBe(200);
  });

  test('max consecutive losses', () => {
    const positions: Array<Position> = [
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'BUY',
        winner: false,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:31',
        length: 5,
        action: 'BUY',
        winner: false,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:32',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '09:33',
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
      commissionPerOrder,
    });

    expect(metrics.maxConsecutiveWins).toBe(1);
    expect(metrics.maxConsecutiveWinAmount).toBe(100);

    expect(metrics.maxConsecutiveLosses).toBe(2);
    expect(metrics.maxConsecutiveLossAmount).toBe(200);
  });

  test('check positions by hour', () => {
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
      createTestPosition({
        time: '10:31',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '10:32',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
      }),
      createTestPosition({
        time: '10:33',
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
      commissionPerOrder,
    });

    // Make sure the positions are correctly assigned
    expect(metrics.byHour[8].positions).toBe(0);
    expect(metrics.byHour[9].positions).toBe(2);
    expect(metrics.byHour[10].positions).toBe(3);
  });

  test('check positions by day of week', () => {
    const positions: Array<Position> = [
      createTestPosition({
        time: '09:30',
        length: 5,
        action: 'SELL',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
        date: '2022-01-01',
      }),
      createTestPosition({
        time: '09:31',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
        date: '2022-01-01',
      }),
      createTestPosition({
        time: '10:31',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
        date: '2022-01-02',
      }),
      createTestPosition({
        time: '10:32',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
        date: '2022-01-02',
      }),
      createTestPosition({
        time: '10:33',
        length: 5,
        action: 'BUY',
        winner: true,
        shares: 100,
        entryPrice: 100,
        profitLossPerShares: 1,
        date: '2022-01-03',
      }),
    ];

    const metrics = calculateMetrics(positions, {
      accountSize,
      commissionPerOrder,
    });

    expect(metrics.byDayOfWeek[0].positions).toBe(2);
    expect(metrics.byDayOfWeek[1].positions).toBe(1);
    expect(metrics.byDayOfWeek[2].positions).toBe(0);
    expect(metrics.byDayOfWeek[4].positions).toBe(0);
    expect(metrics.byDayOfWeek[5].positions).toBe(0);
    expect(metrics.byDayOfWeek[6].positions).toBe(2);
  });

  describe('metrics', () => {
    test('profit factor', () => {
      expect(
        createAndUpdatePeriodMetrics({
          grossProfit: 100,
          grossLoss: 50,
        }).profitFactor,
      ).toBe(2);

      expect(
        createAndUpdatePeriodMetrics({
          grossProfit: 50,
          grossLoss: 100,
        }).profitFactor,
      ).toBe(0.5);

      // All losses
      expect(
        createAndUpdatePeriodMetrics({
          grossProfit: 0,
          grossLoss: 100,
        }).profitFactor,
      ).toBe(0);

      // All wins
      expect(
        createAndUpdatePeriodMetrics({
          grossProfit: 100,
          grossLoss: 1,
        }).profitFactor,
      ).toBe(100);
    });

    test('positions', () => {
      expect(
        createAndUpdatePeriodMetrics({
          positions: 1,
        }).positions,
      ).toBe(2);

      expect(
        createAndUpdatePeriodMetrics({
          positions: 300,
        }).positions,
      ).toBe(301);
    });

    test('orders', () => {
      expect(
        createAndUpdatePeriodMetrics(
          {
            orders: 0,
          },
          {
            orderCount: 2,
          },
        ).orders,
      ).toBe(2);

      expect(
        createAndUpdatePeriodMetrics(
          {
            orders: 10,
          },
          {
            orderCount: 1,
          },
        ).orders,
      ).toBe(11);
    });

    test('commission', () => {
      expect(
        createAndUpdatePeriodMetrics(
          {
            commission: 0,
          },
          {
            commissionPerOrder: 1,
            orderCount: 10,
          },
        ).commission,
      ).toBe(10);

      expect(
        createAndUpdatePeriodMetrics(
          {
            commission: 10,
          },
          {
            commissionPerOrder: 1.5,
            orderCount: 10,
          },
        ).commission,
      ).toBe(25);
    });

    test('long and short positions', () => {
      let data = createAndUpdatePeriodMetrics(
        {
          commission: 0,
          longPositions: 0,
        },
        {
          direction: 'LONG',
          commissionPerOrder: 1,
          orderCount: 2,
        },
      );

      // Check long positions
      expect(data.shortPositions).toBe(0);
      expect(data.longPositions).toBe(1);
      expect(data.commission).toBe(2);

      // Check short positions
      data = createAndUpdatePeriodMetrics(data, {
        direction: 'SHORT',
        commissionPerOrder: 1,
        orderCount: 2,
        positionPnL: 100,
      });

      expect(data.shortPositions).toBe(1);
      expect(data.longPositions).toBe(1);

      // check commission
      expect(data.commission).toBe(4);
      expect(data.netProfitAndLoss).toBe(96);
    });

    test('gross profit', () => {
      let data = createAndUpdatePeriodMetrics(
        {},
        {
          direction: 'LONG',
          positionPnL: 100,
          commissionPerOrder: 1,
        },
      );

      expect(data.longWinners).toBe(1);
      expect(data.longWinnerPercent).toBe(1);
      expect(data.grossProfit).toBe(100);
      expect(data.grossLoss).toBe(0);

      data = createAndUpdatePeriodMetrics(data, {
        direction: 'LONG',
        positionPnL: -50,
      });

      expect(data.longWinners).toBe(1);
      expect(data.longWinnerPercent).toBe(0.5);
      expect(data.grossProfit).toBe(100);
      expect(data.grossLoss).toBe(50);
    });

    test('average position pnl', () => {
      const metrics = calculateMetrics(
        [
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
            time: '09:30',
            length: 5,
            action: 'BUY',
            winner: true,
            shares: 100,
            entryPrice: 100,
            profitLossPerShares: 1,
          }),
          createTestPosition({
            time: '09:30',
            length: 5,
            action: 'BUY',
            winner: false,
            shares: 100,
            entryPrice: 100,
            profitLossPerShares: 1,
          }),
          createTestPosition({
            time: '09:30',
            length: 5,
            action: 'BUY',
            winner: false,
            shares: 100,
            entryPrice: 100,
            profitLossPerShares: 1,
          }),
          createTestPosition({
            time: '09:30',
            length: 5,
            action: 'BUY',
            winner: false,
            shares: 100,
            entryPrice: 100,
            profitLossPerShares: 1,
          }),
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
            time: '09:30',
            length: 5,
            action: 'BUY',
            winner: true,
            shares: 100,
            entryPrice: 100,
            profitLossPerShares: 1,
          }),
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
            time: '09:30',
            length: 5,
            action: 'BUY',
            winner: false,
            shares: 100,
            entryPrice: 100,
            profitLossPerShares: 1,
          }),
        ],
        {
          accountSize,
          commissionPerOrder,
        },
      );

      expect(metrics.metricsByPosition).toMatchInlineSnapshot(`
        Array [
          Object {
            "accountBalance": 1000,
            "drawdown": 0,
            "pnl": 0,
          },
          Object {
            "accountBalance": 1098,
            "drawdown": 0,
            "pnl": 98,
          },
          Object {
            "accountBalance": 1196,
            "drawdown": 0,
            "pnl": 196,
          },
          Object {
            "accountBalance": 1094,
            "drawdown": -102,
            "pnl": 94,
          },
          Object {
            "accountBalance": 992,
            "drawdown": -204,
            "pnl": -8,
          },
          Object {
            "accountBalance": 890,
            "drawdown": -306,
            "pnl": -110,
          },
          Object {
            "accountBalance": 988,
            "drawdown": -208,
            "pnl": -12,
          },
          Object {
            "accountBalance": 1086,
            "drawdown": -110,
            "pnl": 86,
          },
          Object {
            "accountBalance": 1184,
            "drawdown": -12,
            "pnl": 184,
          },
          Object {
            "accountBalance": 1082,
            "drawdown": -114,
            "pnl": 82,
          },
        ]
      `);

      expect(metrics.maxDrawdown).toBe(-306);
    });
  });
});
