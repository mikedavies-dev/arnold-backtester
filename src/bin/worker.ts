// Access the workerData by requiring it.
import {parentPort, workerData, threadId} from 'worker_threads';
import {format} from 'date-fns';
import numeral from 'numeral';

import Logger from '../utils/logger';
import {loadTsData, Tick} from '../utils/data';
import {Profile} from '../utils/profile';
import {loadStrategy} from '../utils/module';
import {mergeSortedArrays} from '../utils/data-structures';
import {initTracker, updateTracker, Tracker} from '../utils/tracker';
import {getMarketOpen, getMarketClose} from '../utils/market';

const log = Logger(`Worker#${threadId}`);

type Params = {
  symbol: string;
  date: Date;
};

function marketSortFn(row1: Tick, row2: Tick) {
  // Sort on both index and time so we don't loose th original order
  // if we have multiple values per second
  const val1 = row1.time * 1000000 + row1.index;
  const val2 = row2.time * 1000000 + row1.index;

  return val1 - val2;
}

async function execute(param: Params) {
  if (!parentPort) {
    return;
  }

  const {profile}: {profile: Profile} = workerData;

  // Make sure the module exists
  const modulePath = `../strategies/${profile.strategy}.js`;

  const strategy = await loadStrategy(modulePath);

  if (!strategy) {
    parentPort.postMessage({ok: false, error: 'strategy-not-found'});
    return;
  }

  const symbols = Array.from(new Set([param.symbol, ...strategy.extraSymbols]));

  const start = Date.now();

  log(
    `Loading TS data for ${symbols.join(', ')} on ${format(
      param.date,
      'yyyy-MM-dd',
    )}`,
  );

  // Load the main symbol data
  const symbolData = await Promise.all(
    symbols.map(async symbol => await loadTsData(symbol, param.date)),
  );

  if (symbolData.some(data => !data)) {
    parentPort.postMessage({ok: false, error: 'no-symbol-data'});
    return;
  }

  // Merge all the data
  const marketData = mergeSortedArrays<Tick>(
    symbolData as Array<Tick[]>,
    marketSortFn,
  );

  // Iterate the data..
  log(
    `Loaded ${marketData.length} ticks for ${
      param.symbol
    } and ${strategy.extraSymbols.join(', ')}`,
  );

  const trackers = symbols.reduce(
    (acc, symbol) => ({
      ...acc,
      [symbol]: initTracker(),
    }),
    {} as Record<string, Tracker>,
  );

  const marketOpen = getMarketOpen(param.date);
  const marketClose = getMarketClose(param.date);

  marketData.forEach(tick => {
    if (!trackers[tick.symbol]) {
      log(`!!! tick for unknown symbol ${tick.symbol}`);
      return;
    }

    const tracker = trackers[tick.symbol];

    // Update the tracker data
    updateTracker({
      data: tracker,
      tick,
      marketOpen,
      marketClose,
    });
  });

  await log(
    `Finished ${param.symbol} in ${numeral(Date.now() - start).format(',')}ms`,
  );

  return [];
}

if (parentPort) {
  parentPort.on('message', async (param: Params) => {
    if (!parentPort) {
      return;
    }

    try {
      const result = await execute(param);

      // Let it log some stuff
      await new Promise(resolve => setTimeout(resolve, 0));

      parentPort.postMessage(result);
    } catch (err) {
      log('Failed', err);
      parentPort.postMessage({
        ok: false,
        err,
      });
    }
  });
}
