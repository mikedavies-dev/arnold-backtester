import {startOfDay, subDays} from 'date-fns';

import Logger from '../utils/logger';
import {connect, disconnect} from '../utils/db';
import {createDataProvider} from '../utils/data-provider';
import {profileExists, loadProfile} from '../utils/profile';
import {
  ensureBarDataIsAvailable,
  ensureSymbolsAreAvailable,
  ensureTickDataIsAvailable,
} from '../utils/data-storage';
import series from 'promise-series2';

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

        const {symbols} = runProfile;

        // Make sure we have
        await ensureSymbolsAreAvailable({
          dataProvider,
          symbols,
        });

        // Make sure we have the data available
        const yesterday = startOfDay(subDays(new Date(), 1));

        await ensureBarDataIsAvailable({
          dataProvider,
          symbols,
          log,
          until: yesterday,
        });

        await ensureTickDataIsAvailable({
          dataProvider,
          symbols,
          dates: runProfile.dates.dates,
          log,
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
