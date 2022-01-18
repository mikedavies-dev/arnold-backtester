import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import Env from '../utils/env';

const marv = require('marv/api/promise');
const driver = require('marv-mysql-driver');

async function runMigrations() {
  // Load the migrations
  const directory = path.resolve('migrations');
  const migrations = await marv.scan(directory);

  // Run the migrations
  await marv.migrate(
    migrations,
    driver({
      connection: {
        host: Env.MYSQL_HOST,
        port: Env.MYSQL_PORT,
        database: Env.MYSQL_DB,
        user: Env.MYSQL_USER,
        password: Env.MYSQL_PASS,
        multipleStatements: true,
      },
    }),
  );
}

runMigrations();
