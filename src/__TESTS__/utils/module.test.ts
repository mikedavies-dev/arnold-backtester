import {loadStrategy} from '../../utils/module';
import Env from '../../utils/env';

test('Load valid test module', async () => {
  const modulePath = Env.getUserPath('test-strategies/sample.ts');
  const Strategy = await loadStrategy(modulePath);

  expect(Strategy?.extraSymbols).toMatchInlineSnapshot(`
    Array [
      "SPY",
    ]
  `);
  expect(Strategy?.factory).toMatchInlineSnapshot(`[Function]`);
});

test('Load valid test module that does not export extra symbols', async () => {
  const modulePath = Env.getUserPath(
    'test-strategies/without-extra-symbols.ts',
  );
  const Strategy = await loadStrategy(modulePath);

  expect(Strategy?.extraSymbols.length).toBe(0);
});

test('Return null from invalid module', async () => {
  const modulePath = Env.getUserPath('test-strategies/invalid.ts');

  const strategy = await loadStrategy(modulePath);

  expect(strategy).toBeNull();
});
