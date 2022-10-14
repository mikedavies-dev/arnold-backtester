/*
Boilerplate code that registers ts-node and then loads the worker.ts file.

https://github.com/SUCHMOKUO/node-worker-threads-pool/issues/11
https://wanago.io/2019/05/06/node-js-typescript-12-worker-threads/
*/

const path = require('path');

require('ts-node').register({
  transpileOnly: true,
});

require(path.resolve(__dirname, './worker.ts'));
