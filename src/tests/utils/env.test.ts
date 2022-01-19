import Env from '../../utils/env';

test('basic env functionality', () => {
  expect(Env.isProduction).toBe(false);
  expect(Env.isTesting).toBe(true);
  expect(Env.env).not.toBe(null);
  expect(Env.MONGO_CONNECTION_STRING).not.toBe(null);
  expect(Env.env.TEST_CONFIG_SETTING).toBe('1234');
});
