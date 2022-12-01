import {loadStrategy} from '../../utils/module';
import Env from '../../utils/env';

test('Load valid test module', async () => {
  const modulePath = Env.getUserPath('test-strategies/sample.ts');
  const strategy = await loadStrategy(modulePath);

  expect(strategy?.extraSymbols).toMatchInlineSnapshot(`
    Array [
      "SPY",
    ]
  `);
  expect(strategy?.init).toMatchInlineSnapshot(`[Function]`);
});

test('Return null from invalid module', async () => {
  const modulePath = Env.getUserPath('test-strategies/invalid.ts');

  const strategy = await loadStrategy(modulePath);

  expect(strategy).toBeNull();
});
