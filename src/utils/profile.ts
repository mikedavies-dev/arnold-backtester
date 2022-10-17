import fs from 'fs/promises';
import {parse, differenceInDays, startOfDay, add} from 'date-fns';

import {Profile} from '../core';
import Env from '../utils/env';
import {loadSymbolLists} from '../utils/symbol-lists';

async function loadStrategySource(path: string) {
  try {
    return await fs.readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

async function loadJsOrTsStrategySource(strategy: string) {
  return (
    (await loadStrategySource(
      Env.getUserPath(`./strategies/${strategy}.js`),
    )) ||
    (await loadStrategySource(Env.getUserPath(`./strategies/${strategy}.ts`)))
  );
}

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
  extraSymbols: string[];
};

export function getPath(name: string) {
  return Env.getUserPath(`./profiles/${name}.json`);
}

export async function profileExists(name: string) {
  try {
    await fs.stat(getPath(name));
    return true;
  } catch (err) {
    return false;
  }
}

export async function loadProfile(name: string): Promise<Profile> {
  if (!(await profileExists(name))) {
    throw new Error('This profile does not exist');
  }

  const profile = require(getPath(name)) as RawProfile;

  const from = parse(profile.dates.from, 'yyyy-MM-dd', new Date());
  const to = parse(profile.dates.to, 'yyyy-MM-dd', new Date());

  const days = differenceInDays(to, from);
  const start = startOfDay(from);

  const dates = Array(days + 1)
    .fill(null)
    .map((_, index) =>
      add(start, {
        days: index,
      }),
    );

  return {
    ...profile,
    symbols: await loadSymbolLists(profile.symbols),
    strategy: {
      name: profile.strategy,
      source: await loadJsOrTsStrategySource(profile.strategy),
    },
    dates: {
      from,
      to,
      dates,
    },
  };
}
