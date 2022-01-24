import {Express} from 'express';

export function init(app: Express) {
  app.get('/api', (req, res) => {
    res.send({
      ok: true,
    });
  });
}
