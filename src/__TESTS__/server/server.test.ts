import {Server} from 'http';
import axios from 'axios';

import {startServer} from '../../server/server';
import {backtestResults} from '../test-utils/backtest';

import Env from '../../utils/env';
import {getBacktests, getBacktest} from '../../utils/db';

let server: Server | null = null;
const instance = axios.create({
  baseURL: `http://localhost:${Env.SERVER_PORT}`,
  validateStatus: () => true,
});

// Hide log messages
const log = jest.spyOn(console, 'log').mockImplementation(() => {});

jest.mock('../../utils/db');

const getBacktestsMock = getBacktests as jest.MockedFunction<
  typeof getBacktests
>;

const getBacktestMock = getBacktest as jest.MockedFunction<typeof getBacktest>;

beforeAll(async () => {
  server = await startServer();
});

test('loading the homepage', async () => {
  const res = await instance.get('/');
  expect(res.status).toBe(200);
  expect(res.data).toMatchInlineSnapshot(
    `"Arnold 💪 - Stock/Crypto Backtesting Platform"`,
  );
});

test('basic api call', async () => {
  const res = await instance.get('/api/health');
  expect(res.status).toBe(200);
});

test('list backtests', async () => {
  getBacktestsMock.mockResolvedValue(backtestResults);
  const res = await instance.get('/api/backtests');
  expect(res.status).toBe(200);
  expect(res.data).toMatchInlineSnapshot(`
    Array [
      Object {
        "createdAt": "2022-01-01T05:00:00.000Z",
        "id": "abcd",
        "strategy": "test",
        "symbols": Array [
          "ZZZZ",
        ],
      },
    ]
  `);
  getBacktestsMock.mockReset();
});

test('get a backtest by id', async () => {
  getBacktestMock.mockResolvedValue(
    backtestResults.find(a => a._id === 'abcd') || null,
  );
  const res = await instance.get('/api/backtest/abcd');
  expect(res.status).toBe(200);
  expect(res.data).toMatchInlineSnapshot(`
    Object {
      "_id": "abcd",
      "createdAt": "2022-01-01T05:00:00.000Z",
      "positions": Array [
        Object {
          "closeReason": "test",
          "data": Object {},
          "isClosing": false,
          "orders": Array [
            Object {
              "action": "BUY",
              "avgFillPrice": 1,
              "filledAt": "2022-01-01T05:00:00.000Z",
              "id": 1,
              "openedAt": "2022-01-01T05:00:00.000Z",
              "parentId": 0,
              "shares": 100,
              "state": "FILLED",
              "symbol": "ZZZZ",
              "type": "MKT",
            },
          ],
          "size": 100,
          "symbol": "ZZZZ",
        },
      ],
      "profile": Object {
        "dates": Object {
          "dates": Array [
            "2022-01-01T05:00:00.000Z",
          ],
          "from": "2022-01-01T05:00:00.000Z",
          "to": "2022-01-01T05:00:00.000Z",
        },
        "strategy": Object {
          "name": "test",
          "source": "test",
        },
        "symbols": Array [
          "ZZZZ",
        ],
        "threads": 4,
      },
    }
  `);
  getBacktestMock.mockReset();
});

test('try to get an invalid broadcast', async () => {
  getBacktestMock.mockResolvedValue(null);
  const res = await instance.get('/api/backtest/abcd');
  expect(res.status).toBe(404);
  getBacktestMock.mockReset();
});

afterAll(async () => {
  // Shutdown the server
  if (server) {
    await server.close();
  }

  log.mockReset();
});
