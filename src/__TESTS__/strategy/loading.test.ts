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
        "isSetup": [Function],
        "source": "/*
      Sample Live Strategy
      */

      import {HandleTickParameters, IsSetupParameters} from '../../../core';

      export const extraSymbols = ['SPY'];

      export function init() {}

      export function isSetup({
        // symbol,
        // tracker,
        // log,
        marketTime,
        marketOpen,
      }: IsSetupParameters) {
        // We are in a setup once the market is open
        return marketTime > marketOpen;
      }

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
        "isSetup": [Function],
        "source": "/*
      Sample Backtest Strategy
      */

      import {HandleTickParameters, IsSetupParameters} from '../../../core';

      export const extraSymbols = ['SPY'];

      export function init() {}

      export function isSetup({
        // symbol,
        // tracker,
        // log,
        marketTime,
        marketOpen,
      }: IsSetupParameters) {
        // We are in a setup once the market is open
        return marketTime > marketOpen;
      }

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
