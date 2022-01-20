import {runBacktest} from '../../backtest/worker';
import {loadProfile} from '../../utils/profile';
import {
  createTimeAsDate,
  createTimeAsUnix,
  getTestDate,
} from '../test-utils/tick';

import {loadStrategy} from '../../utils/module';

import {loadTsForSymbolAndDate} from '../../utils/data';

import {Tick} from '../../core';

jest.mock('../../utils/data');
jest.mock('../../utils/module');

const loadTsForSymbolAndDateMock =
  loadTsForSymbolAndDate as jest.MockedFunction<typeof loadTsForSymbolAndDate>;

const loadStrategyMock = loadStrategy as jest.MockedFunction<
  typeof loadStrategy
>;

const symbol = 'MSFT';

const testMarketData = [
  {
    symbol,
    type: 'ASK',
    value: 1,
    size: 1,
    index: 0,
    time: createTimeAsUnix('09:30'),
    dateTime: createTimeAsDate('09:30'),
  },
  {
    symbol,
    type: 'BID',
    value: 1,
    size: 1,
    index: 0,
    time: createTimeAsUnix('09:30'),
    dateTime: createTimeAsDate('09:30'),
  },
  {
    symbol,
    type: 'TRADE',
    value: 1,
    size: 1,
    index: 0,
    time: createTimeAsUnix('09:31'),
    dateTime: createTimeAsDate('09:31'),
  },
] as Array<Tick>;

describe('test worker module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('placing a market order in the backtester', async () => {
    const profile = await loadProfile('sample');

    loadStrategyMock.mockResolvedValue({
      init: () => {},
      extraSymbols: [],
      handleTick: ({broker}) => {
        if (!broker.hasOpenOrders(symbol)) {
          broker.placeOrder({
            symbol,
            type: 'MKT',
            shares: 100,
            action: 'BUY',
          });

          // Make sure we have pending orders
          expect(broker.hasOpenOrders(symbol)).toBe(true);

          // Make sure our position size is still 0
          expect(broker.getPositionSize(symbol)).toBe(0);
        }
      },
    });

    loadTsForSymbolAndDateMock.mockResolvedValue(testMarketData);

    const data = await runBacktest({
      profile,
      symbol,
      date: getTestDate(),
      log: () => {},
    });

    expect(data).toMatchInlineSnapshot(`
      Array [
        Object {
          "closeReason": null,
          "data": Object {},
          "isClosing": false,
          "orders": Array [
            Object {
              "action": "BUY",
              "avgFillPrice": 1,
              "filledAt": 2022-01-01T14:31:00.000Z,
              "id": 1,
              "openedAt": 2022-01-01T14:30:00.000Z,
              "shares": 100,
              "state": "FILLED",
              "symbol": "MSFT",
              "type": "MKT",
            },
          ],
          "size": 100,
          "symbol": "MSFT",
        },
      ]
    `);
    loadTsForSymbolAndDateMock.mockClear();
    loadStrategyMock.mockClear();
  });
});
