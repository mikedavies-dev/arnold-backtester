import express from 'express';
import path from 'path';

import Logger from '../utils/logger';

const log = Logger('Express');

import * as Home from './routes/home';
import * as Api from './routes/api';

export async function startServer() {
  const app = express();
  const PORT = 4020;

  // Setup static files
  app.use(express.static(path.join(__dirname, '../public')));

  Home.init(app);
  Api.init(app);

  // Start the server
  await app.listen(PORT);

  // Tell the world
  log(`⚡️ Server is running at http://localhost:${PORT}`);

  // return..
  return app;
}
