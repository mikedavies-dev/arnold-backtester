import {Express} from 'express';

export function init(app: Express) {
  app.get('/api/health', (req, res) => {
    res.send({
      ok: true,
    });
  });
}
