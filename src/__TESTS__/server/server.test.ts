import {Server} from 'http';
import axios from 'axios';

import {startServer} from '../../server/server';
import Env from '../../utils/env';

let server: Server | null = null;
const instance = axios.create({
  baseURL: `http://localhost:${Env.SERVER_PORT}`,
});

// Hide log messages
const log = jest.spyOn(console, 'log').mockImplementation(() => {});

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

afterAll(async () => {
  if (server) {
    await server.close();
  }

  log.mockReset();
});
