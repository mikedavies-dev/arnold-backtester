// Access the workerData by requiring it.
import {parentPort, workerData} from 'worker_threads';
import Logger from '../utils/logger';
import {loadTsData, Tick} from '../utils/data';
import {Profile} from '../utils/profile';
import {loadStrategy} from '../utils/module';
import {mergeSortedArrays} from '../utils/data-structures';

const log = Logger('Worker');

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

if (parentPort) {
  parentPort.on('message', async (param: Params) => {
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

    const symbols = Array.from(
      new Set([param.symbol, ...strategy.extraSymbols]),
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

    // return the result to main thread.
    parentPort.postMessage(param);
  });
}
