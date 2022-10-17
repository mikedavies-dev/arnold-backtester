import {Express} from 'express';

export function init(app: Express) {
  app.get('/', (req, res) => {
    res.send('Arnold 💪 - Stock Backtesting and Trading Platform');
  });
}
