import fs from 'fs/promises';

import Env from './env';
import {loadStrategy} from './module';

export async function loadBacktestStrategy(name: string) {
  const factory = await loadStrategy(
    Env.getUserPath(`./test-strategies/${name}.ts`),
  );

  if (!factory) {
    throw new Error(`Test strategy not found ${name}`);
  }

  return {
    factory,
    source: await fs.readFile(
      Env.getUserPath(`./test-strategies/${name}.ts`),
      'utf-8',
    ),
  };
}

export async function loadLiveStrategy(name: string) {
  const factory = await loadStrategy(
    Env.getUserPath(`./live-strategies/${name}.ts`),
  );

  if (!factory) {
    throw new Error(`Live strategy not found ${name}`);
  }

  return {
    factory,
    source: await fs.readFile(
      Env.getUserPath(`./live-strategies/${name}.ts`),
      'utf-8',
    ),
  };
}
