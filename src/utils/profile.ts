import fs from 'fs/promises';

type Profile = {
  strategy: string;
  startingBalance: number;
  dates: {
    from: Date;
    to: Date;
  };
  symbols: Array<string>;
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

export async function loadProfile(name: string) {
  if (!(await profileExists(name))) {
    throw new Error('This profile does not exist');
  }
  return require(`../../${getPath(name)}`) as Profile;
}
