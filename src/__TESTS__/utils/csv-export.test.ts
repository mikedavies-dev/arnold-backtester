import {positionsCsv, positionsHeaders} from '../../utils/csv-export';
import {getTestDate} from '../testing/tick';

describe('test csv exports', () => {
  test('positions header export', () => {
    const headers = positionsHeaders();
    expect(headers.length).toBeGreaterThan(0);
  });

  test('empty positions', () => {
    const csv = positionsCsv([]);
    expect(csv).toBe('');
  });

  test('single position', () => {
    const csv = positionsCsv([
      {
        openedAt: getTestDate(),
        closedAt: getTestDate(),
        closeReason: 'test position 1',
        symbol: 'AAPL',
        size: 0,
        orders: [],
        isClosing: false,
        data: {},
      },
      {
        openedAt: getTestDate(),
        closedAt: getTestDate(),
        closeReason: 'test position 2',
        symbol: 'AAPL',
        size: 0,
        orders: [],
        isClosing: false,
        data: {},
      },
    ]);
    expect(csv.split(/\n/).length).toBe(3);
  });

  test('ignore positions that have not closed', () => {
    const csv = positionsCsv([
      {
        openedAt: getTestDate(),
        closedAt: null,
        closeReason: 'test position 1',
        symbol: 'AAPL',
        size: 0,
        orders: [],
        isClosing: false,
        data: {},
      },
    ]);
    expect(csv).toBe('');
  });
});
