import {run} from '../ui/cli/apps/trader';
import {runLiveController} from '../trader/controller';

import {connect, disconnect} from '../utils/db';

async function runApp() {
  try {
    const ui = run({
      onQuit: () => {
        // quit the trader..
        process.exit();

        // what can we do here?!
      },
    });

    ui.log('Connecting to database');

    await connect();

    // run the trader
    await runLiveController({
      log: ui.log,
      exit: () => false,
      update: args => {
        ui.update(args);
      },
    });
  } catch (err) {
    console.log('Failed', err);
    process.exit();
  } finally {
    await disconnect();
  }
}

runApp();
