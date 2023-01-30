import log4js from 'log4js';

log4js.configure({
  appenders: {
    logs: {
      type: 'dateFile',
      filename: './user/logs/trader.log',
      pattern: 'yyyyMMdd',
    },
    console: {type: 'console'},
  },
  categories: {
    default: {appenders: ['logs'], level: 'trace'},
  },
});

export const logger = log4js.getLogger();

export const shutdown = () => {
  return new Promise(resolve => log4js.shutdown(resolve));
};
