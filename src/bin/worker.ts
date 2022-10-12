// Access the workerData by requiring it.
import {parentPort, workerData, threadId} from 'worker_threads';

import Logger from '../utils/logger';
import {runBacktest, BacktestWorkerError} from '../backtest/worker';
import {Profile} from '../core';

import {connect, disconnect} from '../utils/db';

const log = Logger(`Worker#${threadId}`);

if (parentPort) {
  parentPort.on('message', async (param: {symbol: string; date: Date}) => {
    if (!parentPort) {
      return;
    }

    const {profile}: {profile: Profile} = workerData;

    try {
      log('Connecting to database');
      await connect();

      const positions = await runBacktest({
        profile,
        symbol: param.symbol,
        date: param.date,
        log,
      });

      // Send the results to the parent
      parentPort.postMessage({
        positions,
      });
    } catch (err) {
      parentPort.postMessage({
        error: err instanceof BacktestWorkerError ? err.code : 'unknown',
      });
    } finally {
      await disconnect();
      log('Finished!');
    }
  });
}
