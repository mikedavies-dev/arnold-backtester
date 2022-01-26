import express from 'express';
import path from 'path';

import Logger from '../utils/logger';
import Env from '../utils/env';

import * as Home from './routes/home';
import * as Api from './routes/api';

const log = Logger('Express');

export async function startServer() {
  const app = express();

  // Setup static files
  app.use(express.static(path.join(__dirname, '../public')));

  Home.init(app);
  Api.init(app);

  // Start the server
  const server = app.listen(Env.SERVER_PORT, () => {
    // Tell the world
    log(`⚡️ Server is running at http://localhost:${Env.SERVER_PORT}`);
  });

  // return..
  return server;
}
