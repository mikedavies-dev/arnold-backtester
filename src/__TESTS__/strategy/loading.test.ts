import {loadLiveStrategy, loadBacktestStrategy} from '../../utils/strategy';

describe('test strategy loading', () => {
  test('loading a live strategy', async () => {
    const strategy = await loadLiveStrategy('sample');

    expect(strategy).toMatchInlineSnapshot(`
      Object {
        "extraSymbols": Array [
          "SPY",
        ],
        "handleTick": [Function],
        "init": [Function],
        "isSetup": undefined,
        "source": "/*
      Sample Live Strategy
      */

      import {HandleTickParameters} from '../../../core';

      export const extraSymbols = ['SPY'];

      export function init() {}

      export function handleTick({tick, symbol, log}: HandleTickParameters) {
        log(symbol, tick);
      }
      ",
      }
    `);
  });

  test('loading a test strategy', async () => {
    const strategy = await loadBacktestStrategy('sample');

    expect(strategy).toMatchInlineSnapshot(`
      Object {
        "extraSymbols": Array [
          "SPY",
        ],
        "handleTick": [Function],
        "init": [Function],
        "isSetup": undefined,
        "source": "/*
      Sample Backtest Strategy
      */

      import {HandleTickParameters} from '../../../core';

      export const extraSymbols = ['SPY'];

      export function init() {}

      export function handleTick({tick, symbol, log}: HandleTickParameters) {
        log(symbol, tick);
      }
      ",
      }
    `);
  });

  test('load an invalid live strategy', async () => {
    expect(
      loadLiveStrategy('invalid'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Live strategy not found invalid"`,
    );
  });

  test('load an invalid test strategy', async () => {
    expect(
      loadBacktestStrategy('invalid'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test strategy not found invalid"`,
    );
  });
});
