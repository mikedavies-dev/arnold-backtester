import fs from 'fs/promises';

import Env from './env';

async function readFile(path: string) {
  try {
    return await fs.readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

export async function loadBacktestStrategySource(strategy: string) {
  return (
    (await readFile(Env.getUserPath(`./test-strategies/${strategy}.js`))) ||
    (await readFile(Env.getUserPath(`./test-strategies/${strategy}.ts`)))
  );
}

export async function loadLiveStrategySource(strategy: string) {
  return (
    (await readFile(Env.getUserPath(`./live-strategies/${strategy}.js`))) ||
    (await readFile(Env.getUserPath(`./live-strategies/${strategy}.ts`)))
  );
}
