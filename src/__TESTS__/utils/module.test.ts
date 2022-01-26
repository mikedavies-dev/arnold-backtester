import {loadStrategy} from '../../utils/module';

test('Load valid test module', async () => {
  const modulePath = `../strategies/sample.ts`;

  const strategy = await loadStrategy(modulePath);

  expect(strategy?.extraSymbols).toMatchInlineSnapshot(`
    Array [
      "SPY",
    ]
  `);
  expect(strategy?.init).toMatchInlineSnapshot(`[Function]`);
});

test('Return null from invalid module', async () => {
  const modulePath = `../strategies/invalid.ts`;

  const strategy = await loadStrategy(modulePath);

  expect(strategy).toBeNull();
});
