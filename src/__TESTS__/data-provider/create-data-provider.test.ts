import {createDataProvider} from '../../utils/data-provider';
import Env from '../../utils/env';

const originalProviderBacktest = Env.DATA_PROVIDER_BACKTEST;
const originalProviderTrader = Env.DATA_PROVIDER_TRADER;

afterEach(() => {
  Env.DATA_PROVIDER_BACKTEST = originalProviderBacktest;
  Env.DATA_PROVIDER_TRADER = originalProviderTrader;
});

test('create a data provider (ib)', () => {
  const provider = createDataProvider({type: 'backtest'});
  expect(provider).not.toBe(null);
});

test('fail to create an invalid data provider', () => {
  Env.DATA_PROVIDER_BACKTEST = 'INVALID';
  Env.DATA_PROVIDER_TRADER = 'INVALID';

  expect(() => {
    createDataProvider({type: 'backtest'});
  }).toThrowError();
});
