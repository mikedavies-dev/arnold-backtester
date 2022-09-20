import series from 'promise-series2';

import Logger from '../utils/logger';
import {connect, disconnect} from '../utils/db';
import {createDataProvider} from '../utils/data-provider';
import {profileExists, loadProfile} from '../utils/profile';
import {
  ensureBarDataIsAvailable,
  ensureSymbolsAreAvailable,
} from '../utils/data-storage';

const log = Logger('ensure-data');

async function run() {
  try {
    try {
      log('Connecting to database');
      await connect();
    } catch (err) {
      log('Failed to connect to database, check connection');
      return;
    }

    const dataProvider = createDataProvider();

    // Connect to data provider
    try {
      await dataProvider.init();
    } catch (err) {
      log('Failed to connect to the data provider, check connection');
      await disconnect();
      return;
    }

    const profiles = process.argv.slice(2);

    if (!profiles.length) {
      log('Please specify a profile');
    }

    await series(
      async profile => {
        if (!(await profileExists(profile))) {
          log(`Profile '${profile}' is not valid, ignoring`);
          return;
        }

        const runProfile = await loadProfile(profile);

        const symbolsThatRequireData = Array.from(
          new Set([...runProfile.symbols, ...runProfile.extraSymbols]),
        );

        // Make sure we have
        await ensureSymbolsAreAvailable({
          dataProvider,
          symbols: symbolsThatRequireData,
        });

        await ensureBarDataIsAvailable({
          dataProvider,
          symbols: symbolsThatRequireData,
          log,
          from: runProfile.dates.from,
          to: runProfile.dates.to,
        });
      },
      false,
      profiles,
    );

    // Disconnect from the db
    await disconnect();

    // Disconnect from the data provider
    await dataProvider.shutdown();

    log('Finished!');
  } catch (err) {
    log(`Failed to run load data`, err);
  }
}

run();
