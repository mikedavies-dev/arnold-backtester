// Access the workerData by requiring it.
import {parentPort, workerData} from 'worker_threads';
import Logger from '../utils/logger';

const log = Logger('Worker');

if (parentPort) {
  parentPort.on('message', async param => {
    // Access the workerData.
    console.log('workerData is', workerData, param);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // return the result to main thread.
    if (parentPort) {
      parentPort.postMessage(param);
    }
  });
}
