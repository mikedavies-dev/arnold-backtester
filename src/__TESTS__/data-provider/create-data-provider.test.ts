import {createDataProvider} from '../../utils/data-provider';
import Env from '../../utils/env';

const originalProvider = Env.DATA_PROVIDER;

afterEach(() => {
  Env.DATA_PROVIDER = originalProvider;
});

test('create a data provider (ib)', () => {
  const provider = createDataProvider();
  expect(provider).not.toBe(null);
});

test('fail to create an invalid data provider', () => {
  Env.DATA_PROVIDER = 'INVALID';
  expect(() => {
    createDataProvider();
  }).toThrowError();
});
