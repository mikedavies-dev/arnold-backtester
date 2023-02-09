import {run, UIResult} from '../ui/cli/apps/trader';
import {runLiveController} from '../trader/controller';

import {connect, disconnect} from '../utils/db';
import {logger, shutdown as shutdownLogger} from '../utils/file-log';

async function runApp() {
  try {
    let ui: UIResult | null = null;

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
      update: args => {
        if (ui) {
          ui.update(args);
        }
      },
      ready: controller => {
        if (ui) {
          return;
        }
        log('Creating UI');
        ui = run({
          onQuit: async () => {
            controller.quit();
          },
          onCommand: (command, args) => {
            try {
              switch (command.toUpperCase()) {
                case 'CLOSEALL':
                  controller.closeAll();
                  break;

                case 'CLOSE':
                  if (args.length === 1) {
                    const symbol = args[0].toUpperCase();
                    controller.close(symbol);
                  }
                  break;

                default:
                  log(`Unknown command '${command}`);
                  break;
              }
            } catch (err) {
              log(`Command ${command} failed ${err}`);
            }
          },
          onLog: (msg: string, ...args: any[]) => {
            log(msg, ...args);
          },
          onSelectSymbol: symbol => {
            log(`Selecting symbol ${symbol}`);
            controller.selectSymbol(symbol);
          },
        });
      },
    });

    log('Exiting');

    if (ui) {
      // typescript isn't able to figure out that we set UI in the ready callback
      (ui as UIResult).quit();
    }
  } catch (err) {
    logger.error('Failed', err);
    process.exit();
  } finally {
    await disconnect();
    await shutdownLogger();

    process.exit();
  }
}

runApp();
