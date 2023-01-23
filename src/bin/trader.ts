/*
This binary might be moved into some kind of main process in the future
*/

import Logger from '../utils/logger';
import {runLiveController} from '../trader/controller';

import {connect, disconnect} from '../utils/db';

const log = Logger('trader');

async function run() {
  try {
    log('Connecting to database');
    await connect();

    // run the trader
    await runLiveController({
      log,
      exit: () => false,
      update: args => {
        log('Got an update!');
      },
    });
  } catch (err) {
    log(`Failed to run live trader`, err);
  } finally {
    await disconnect();
    log('Finished!');
  }
}

run();
