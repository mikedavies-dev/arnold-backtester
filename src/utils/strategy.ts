import fs from 'fs/promises';

import Env from './env';

async function loadStrategySource(path: string) {
  try {
    return await fs.readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

export async function loadJsOrTsStrategySource(strategy: string) {
  return (
    (await loadStrategySource(
      Env.getUserPath(`./strategies/${strategy}.js`),
    )) ||
    (await loadStrategySource(Env.getUserPath(`./strategies/${strategy}.ts`)))
  );
}
