import express, {Express} from 'express';
import path from 'path';

import Logger from '../utils/logger';

const log = Logger('Express');

const routes = ['home', 'api'];

export async function startServer() {
  const app = express();
  const PORT = 4020;

  // Setup rendering engine
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, '/../../views'));

  // Setup static files
  app.use(express.static(path.join(__dirname, '/../../public')));

  // Import the routes
  routes.forEach(async route => {
    const {init}: {init: (app: Express) => void} = await import(
      `./routes/${route}`
    );
    await init(app);
  });

  // Start the server
  await app.listen(PORT);

  // Tell the world
  log(`⚡️ Server is running at http://localhost:${PORT}!!`);

  // return..
  return app;
}
