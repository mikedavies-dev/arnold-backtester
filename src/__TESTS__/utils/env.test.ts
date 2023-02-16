import Env, {getConfigPath} from '../../utils/env';

test('basic env functionality', () => {
  expect(Env.isProduction).toBe(false);
  expect(Env.isTesting).toBe(true);
  expect(Env.env).not.toBe(null);
  expect(Env.MONGO_CONNECTION_STRING).not.toBe(null);
  expect(Env.getEnv('INVALID', 'default-value')).toBe('default-value');
});

test('get env config path', () => {
  expect(getConfigPath('test')).toMatchInlineSnapshot(`"../../.env.test"`);
  expect(getConfigPath('development')).toMatchInlineSnapshot(`"../../.env"`);
  expect(getConfigPath('production')).toMatchInlineSnapshot(`"../../.env"`);
  expect(getConfigPath(undefined)).toMatchInlineSnapshot(`"../../.env"`);
});
