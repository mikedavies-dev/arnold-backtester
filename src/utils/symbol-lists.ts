import {stat} from 'fs/promises';

import Env from '../utils/env';

async function getUserLists(): Promise<Record<string, string[]>> {
  const listPath = Env.getUserPath('./lists.json');
  const exists = await stat(listPath)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    return {};
  }

  const lists = require(listPath) as {
    name: string;
    symbols: string[];
  }[];

  return lists.reduce((acc, list) => {
    acc[list.name] = list.symbols;
    return acc;
  }, {} as Record<string, string[]>);
}

export async function loadSymbolLists(symbols: string[]): Promise<string[]> {
  const lists = await getUserLists();

  // Load the values into a set to deduplicate them
  const parsed = new Set(
    (
      await Promise.all(
        symbols.map(async symbol => {
          if (symbol.startsWith('@')) {
            const listName = symbol.slice(1);
            const list = lists[listName];

            if (!list) {
              throw new Error(`List ${listName} does not exist`);
            }

            return list;
          }

          return [symbol];
        }),
      )
    ).flat(),
  );

  // return an array based on the set
  return Array.from(parsed).sort();
}
