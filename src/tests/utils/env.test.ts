import Env from '../../utils/env';

test('basic env functionality', () => {
  expect(Env.isProduction).toBe(false);
  expect(Env.isTesting).toBe(true);
  expect(Env.env).not.toBe(null);
});
