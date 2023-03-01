// Access the workerData by requiring it.
import {parentPort, workerData, threadId} from 'worker_threads';

import Logger from '../utils/logger';
import {runBacktest, BacktestWorkerError} from '../backtest/worker';
import {Profile, LogMessage} from '../core';

import {connect, disconnect} from '../utils/db';
import {format} from 'date-fns';

const consoleLogger = Logger(`Worker#${threadId}`);

if (parentPort) {
  parentPort.on(
    'message',
    async (param: {symbol: string; date: Date; keep: boolean}) => {
      const logs: Array<LogMessage> = [];

      if (!parentPort) {
        return;
      }

      const log = (msg: string) => {
        const fullMsg = `[${format(param.date, 'yyyyMMdd')}:${threadId}:${
          param.symbol
        }] ${msg}`;

        if (param.keep) {
          logs.push({
            at: Date.now(),
            msg: fullMsg,
          });
        } else {
          console.log(fullMsg);
        }
      };

      const {profile}: {profile: Profile} = workerData;

      try {
        log('Connecting to database');
        await connect();

        const positions = await runBacktest({
          profile,
          symbol: param.symbol,
          date: param.date,
          log,
          workerIndex: threadId,
        });

        consoleLogger(
          `Finished backtest on ${param.symbol} with ${positions.length} positions and ${logs.length} logs`,
        );

        // Send the results to the parent
        parentPort.postMessage({
          positions,
          logs,
        });
      } catch (err) {
        consoleLogger('Failed', err);
        setTimeout(() => {
          parentPort?.postMessage({
            error: err instanceof BacktestWorkerError ? err.code : 'unknown',
          });
        }, 10);
      } finally {
        await disconnect();
      }
    },
  );
}
