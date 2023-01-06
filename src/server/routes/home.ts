import {Express} from 'express';

export function init(app: Express) {
  app.get('/', (req, res) => {
    res.redirect('./backtest');
  });
}
