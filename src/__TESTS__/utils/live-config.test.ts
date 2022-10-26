import Env from '../../utils/env';
import {getLiveConfig} from '../../utils/live-config';

describe('live config tests', () => {
  test('get live config', async () => {
    const config = await getLiveConfig();
    expect(config).toMatchInlineSnapshot(`
      Object {
        "profiles": Array [
          Object {
            "accountSize": 1000,
            "enabled": true,
            "extraSymbols": Array [
              "SPY",
            ],
            "id": "d2f0d37d-569b-451e-9fe0-52bd4a1f29bf",
            "name": "Sample Strategy",
            "strategy": Object {
              "name": "sample",
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
            },
            "symbols": Array [
              "AAPL",
              "MSFT",
              "TEST1",
              "TEST2",
            ],
          },
        ],
      }
    `);
  });

  test('empty config file fails', async () => {
    // Cause the test to fail to load the list file
    const old = Env.USER_FOLDER;
    Env.USER_FOLDER = './INVALID';
    await expect(getLiveConfig).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Live config does not exist"`,
    );
    Env.USER_FOLDER = old;
  });
});
