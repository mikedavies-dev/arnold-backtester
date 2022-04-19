import {startOfDay, subDays} from 'date-fns';

import Logger from '../utils/logger';
import {connect, disconnect} from '../utils/db';
import {createDataProvider} from '../utils/data-provider';
import {profileExists, loadProfile} from '../utils/profile';
import {
  ensureDataIsAvailable,
  ensureSymbolsAreAvailable,
} from '../utils/data-storage';

const log = Logger('ensure-data');

async function run() {
  try {
    const args = process.argv.slice(2);

    if (!args.length) {
      log('Please specify a profile');
      return;
    }

    const [profile] = args;

    if (!(await profileExists(profile))) {
      throw new Error('This profile is not valid');
    }

    const runProfile = await loadProfile(profile);

    log('Connecting to database');
    await connect();

    const dataProvider = createDataProvider();

    // Connect to data provider
    await dataProvider.init();

    const {symbols} = runProfile;

    // Make sure we have
    await ensureSymbolsAreAvailable({
      dataProvider,
      symbols,
    });

    // Make sure we have the data available
    const yesterday = startOfDay(subDays(new Date(), 1));

    await ensureDataIsAvailable({
      dataProvider,
      symbols,
      log,
      until: yesterday,
    });

    await disconnect();

    log('Finished!');
  } catch (err) {
    log(`Failed to run load data`, err);
  }
}

run();
