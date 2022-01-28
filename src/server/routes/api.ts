import {Express} from 'express';

import {getBacktests, getBacktest} from '../../utils/db';

export function init(app: Express) {
  app.get('/api/health', (req, res) => {
    res.send({
      ok: true,
    });
  });

  app.get('/api/backtests', async (req, res) => {
    const backtests = await getBacktests();

    res.send(
      backtests.map(backtest => {
        return {
          id: backtest._id,
          createdAt: backtest.createdAt,
          symbols: backtest.profile.symbols,
          strategy: backtest.profile.strategy.name,
        };
      }),
    );
  });

  app.get('/api/backtest/:id', async (req, res) => {
    const backtest = await getBacktest(req.params.id);

    if (!backtest) {
      res.status(404).send({});
      return;
    }

    res.send(backtest);
  });
}
