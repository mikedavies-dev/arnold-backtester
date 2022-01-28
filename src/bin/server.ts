import {startServer} from '../server/server';
import {connect} from '../utils/db';

async function run() {
  // connect to mongo
  await connect();

  // Start the server
  await startServer();
}

run();
