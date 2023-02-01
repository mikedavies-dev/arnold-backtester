import {run} from '../ui/cli/apps/trader';
import {runLiveController} from '../trader/controller';

import {connect, disconnect} from '../utils/db';
import {logger, shutdown as shutdownLogger} from '../utils/file-log';

async function runApp() {
  try {
    let ui: ReturnType<typeof run> | null = null;

    const log = (msg: string, ...args: any[]) => {
      logger.log(msg, ...args);
      if (ui) {
        ui.log(msg);
      } else {
        console.log(msg, ...args);
      }
    };

    log('Connecting to database');

    await connect();

    // run the trader
    await runLiveController({
      log,
      exit: () => false,
      update: args => {
        if (ui) {
          ui.update(args);
        }
      },
      ready: () => {
        if (ui) {
          return;
        }
        log('Creating UI');
        ui = run({
          onQuit: async () => {
            log('Shutting down');

            await disconnect();
            await shutdownLogger();

            process.exit();
          },
        });
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
