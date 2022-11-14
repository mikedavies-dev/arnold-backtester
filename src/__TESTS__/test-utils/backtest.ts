import {getTestDate} from './tick';
import {DbBacktest} from '../../core';

export const backtestResults: Array<DbBacktest> = [
  {
    _id: 'abcd',
    createdAt: getTestDate(),
    positions: [
      {
        symbol: 'ZZZZ',
        orders: [
          {
            parentId: 0,
            // https://stackoverflow.com/a/15100043/1167223
            type: 'MKT',
            symbol: 'ZZZZ',
            action: 'BUY',
            shares: 100,
            id: 1,
            openedAt: getTestDate(),
            state: 'FILLED',
            filledAt: getTestDate(),
            avgFillPrice: 1,
            executions: [],
          },
        ],
        size: 100,
        data: {},
        closeReason: 'test',
        isClosing: false,
        openedAt: getTestDate(),
        closedAt: getTestDate(),
      },
    ],
    profile: {
      strategy: {
        name: 'test',
        source: 'test',
      },
      dates: {
        from: getTestDate(),
        to: getTestDate(),
        dates: [getTestDate()],
      },
      symbols: ['ZZZZ'],
      extraSymbols: [],
      threads: 4,
      initialBalance: 10000,
      commissionPerOrder: 1,
    },
  },
];
