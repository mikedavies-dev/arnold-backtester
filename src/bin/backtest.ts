import Logger from '../utils/logger';
import {profileExists, loadProfile} from '../utils/profile';

const log = Logger('backtest');

async function run() {
  const args = process.argv.slice(2);

  if (!args.length) {
    log('Please specify a profile');
    return;
  }

  const [profileName] = args;
  log('Loading', profileName, process.cwd());

  if (!(await profileExists(profileName))) {
    log(`${profileName} does not appear to be a valid profile`);
    return;
  }

  const profile = await loadProfile(profileName);

  log('Profile', profile);
}

run();
