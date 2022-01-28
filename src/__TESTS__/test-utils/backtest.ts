import {getTestDate} from './tick';
import {DbBacktest} from '../../models/models';

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
          },
        ],
        size: 100,
        data: {},
        closeReason: 'test',
        isClosing: false,
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
      threads: 4,
    },
  },
];
