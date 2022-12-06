import Env from './env';
import {fileExists} from './files';

import {LiveTradingConfig} from '../core';
import {loadSymbolLists} from '../utils/symbol-lists';
import {loadLiveStrategy} from './strategy';

export async function getLiveConfig(): Promise<LiveTradingConfig> {
  const configPath = Env.getUserPath('./live.json');

  if (!(await fileExists(configPath))) {
    throw new Error('Live config does not exist');
  }

  const config = require(configPath) as {
    profiles: {
      id: string;
      name: string;
      strategy: string;
      accountSize: number;
      symbols: string[];
      enabled: boolean;
    }[];
  };

  const profiles = await Promise.all(
    config.profiles
      .filter(p => p.enabled)
      .map(async profile => {
        const strategy = await loadLiveStrategy(profile.strategy);

        return {
          ...profile,
          strategy: {
            name: profile.strategy,
            source: strategy.source,
          },
          symbols: await loadSymbolLists(profile.symbols),
          extraSymbols: strategy.extraSymbols,
        };
      }),
  );

  return {
    profiles,
  };
}
