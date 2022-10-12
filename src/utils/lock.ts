/*
This is not the best way of handling inter process locking but it should work for our purposes
for the time being. We do occasionally get multiple processes running at the same time but it
should not happen with the limited number of threads we use.

In the future we should consider adding proper inter-process communication
to enqueue requests and let the main process handle the requests but in the future we might
move away from IB so it might not be an issue
*/

import fs from 'fs/promises';
import lock from 'proper-lockfile';

type LockParams = {
  name: string;
  timeout?: number;
  interval?: number;
};

export async function acquireLock({
  name,
  timeout = 1000,
  interval = 300,
}: LockParams) {
  // Stagger the interval times to avoid two processes hitting the lock file at the same time
  const getInterval = () => {
    const max = interval * 2;
    const min = interval / 2;

    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  // make sure the file exists first
  const filename = `/tmp/${name}.lock`;
  await fs.writeFile(filename, '', {flag: 'w'});

  return new Promise<() => Promise<void>>((resolve, reject) => {
    const start = Date.now();

    const acquire = async () => {
      try {
        const release = await lock.lock(filename, {
          onCompromised: () => {
            // ignore
          },
        });
        resolve(async () => {
          try {
            await release();
          } catch {
            // ignore
          }
        });
      } catch (err) {
        if (Date.now() > start + timeout) {
          reject(new Error('Timeout expired'));
          return;
        }
        setTimeout(acquire, getInterval());
      }
    };

    setTimeout(acquire, getInterval());
  });
}
