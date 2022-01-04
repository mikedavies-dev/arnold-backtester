import fs from 'fs/promises';
import {parse, differenceInDays, startOfDay, add} from 'date-fns';

// Format stored on disk
type RawProfile = {
  strategy: string;
  startingBalance: number;
  dates: {
    from: string;
    to: string;
  };
  symbols: Array<string>;
  threads: number;
};

// Parsed format
export type Profile = {
  strategy: string;
  startingBalance: number;
  dates: {
    from: Date;
    to: Date;
    dates: Array<Date>;
  };
  symbols: Array<string>;
  threads: number;
};

export function getPath(name: string) {
  return `./profiles/${name}.json`;
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
  const profile = require(`../../${getPath(name)}`) as RawProfile;

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
    dates: {
      from,
      to,
      dates,
    },
  };
}
