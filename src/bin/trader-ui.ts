import {run} from '../ui/cli/apps/trader';
import {runLiveController} from '../trader/controller';

import {connect, disconnect} from '../utils/db';
import {logger, shutdown as shutdownLogger} from '../utils/file-log';

async function runApp() {
  try {
    const ui = run({
      onQuit: async () => {
        logger.log('Shutting down');

        await disconnect();
        await shutdownLogger();

        process.exit();
      },
    });

    const log = (msg: string, ...args: any[]) => {
      logger.log(msg, ...args);
      ui.log(msg);
    };

    log('Connecting to database');

    await connect();

    // run the trader
    await runLiveController({
      log,
      exit: () => false,
      update: args => {
        ui.update(args);
      },
    });
  } catch (err) {
    logger.error('Failed', err);
    process.exit();
  } finally {
    await disconnect();
    shutdownLogger();
  }
}

runApp();
