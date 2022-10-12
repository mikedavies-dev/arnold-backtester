import {acquireLock} from '../../utils/lock';

describe('test inter process locking', () => {
  test('create and release a lock', async () => {
    const release = await acquireLock({
      name: 'arnold-test-lock',
      timeout: 3000,
    });
    await release();
  });

  test('wait for a lock to expire', done => {
    const name = 'arnold-test-lock';

    // get the lock
    acquireLock({
      name,
    }).then(async release => {
      // before releasing the lock, try to get it again, it should timeout
      await expect(
        acquireLock({
          name,
          timeout: 300,
          // Set the interval lower than timeout so we call setTimeout
          interval: 100,
        }),
      ).rejects.toThrow('Timeout expired');

      // release the first lock
      await release();
      done();
    });
  });
});
