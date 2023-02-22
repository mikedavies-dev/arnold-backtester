import fs from 'fs/promises';
import {parse} from 'date-fns';

import {Profile} from '../core';
import Env from '../utils/env';
import {loadSymbolLists} from '../utils/symbol-lists';
import {loadBacktestStrategy} from './strategy';
import {dateArray} from './dates';

// Format stored on disk
type RawProfile = {
  strategy: string;
  dates: {
    from: string;
    to: string;
  };
  symbols: Array<string>;
  threads: number;
  initialBalance: number;
  commissionPerOrder: number;
};

export function getPath(name: string) {
  return Env.getUserPath(`./test-profiles/${name}.json`);
}

export async function profileExists(name: string) {
  try {
    await fs.stat(getPath(name));
    return true;
  } catch (err) {
    return false;
  }
}

export async function loadBacktestProfile(name: string): Promise<Profile> {
  if (!(await profileExists(name))) {
    throw new Error('This profile does not exist');
  }

  const profile = require(getPath(name)) as RawProfile;

  const from = parse(profile.dates.from, 'yyyy-MM-dd', new Date());
  const to = parse(profile.dates.to, 'yyyy-MM-dd', new Date());
  const dates = dateArray(from, to);

  const strategy = await loadBacktestStrategy(profile.strategy);

  return {
    ...profile,
    symbols: await loadSymbolLists(profile.symbols),
    strategy: {
      name: profile.strategy,
      source: strategy.source,
    },
    dates: {
      from,
      to,
      dates,
    },
  };
}
