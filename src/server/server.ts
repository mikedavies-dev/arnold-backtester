import express from 'express';
import path from 'path';

import Logger from '../utils/logger';
import Env from '../utils/env';

import * as Home from './routes/home';
import * as Api from './routes/api';

const log = Logger('Express');

export async function startServer() {
  const app = express();

  // Parcel generated files
  app.use(express.static(path.join(__dirname, '../public')));

  Home.init(app);
  Api.init(app);

  const server = app.listen(Env.SERVER_PORT, () => {
    log(`⚡️ Server is running at http://localhost:${Env.SERVER_PORT}`);
  });

  return server;
}
