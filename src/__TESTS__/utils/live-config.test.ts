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
            "name": "Sample Strategy",
            "strategy": Object {
              "name": "sample",
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
