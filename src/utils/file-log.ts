import log4js from 'log4js';

log4js.configure({
  appenders: {
    default: {
      type: 'dateFile',
      filename: './user/logs/default.log',
      pattern: 'yyyyMMdd',
    },
    trader: {
      type: 'dateFile',
      filename: './user/logs/trader.log',
      pattern: 'yyyyMMdd',
    },
    backtest: {
      type: 'dateFile',
      filename: './user/logs/backtest.log',
      pattern: 'yyyyMMdd',
    },
    console: {type: 'console'},
  },
  categories: {
    default: {appenders: ['default'], level: 'trace'},
    trader: {appenders: ['trader'], level: 'trace'},
    backtest: {appenders: ['backtest'], level: 'trace'},
  },
});

export const getLogger = (type: 'trader' | 'backtest') =>
  log4js.getLogger(type);

export const shutdown = () => {
  return new Promise(resolve => log4js.shutdown(resolve));
};
