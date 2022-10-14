import {loadProfile, profileExists} from '../../utils/profile';

test('that a valid profile exists', async () => {
  const exists = await profileExists('sample');
  expect(exists).toBeTruthy();
});

test('that an invalid profile does exists', async () => {
  const exists = await profileExists('invalid');
  expect(exists).toBeFalsy();
});

test('load a valid profile', async () => {
  const profile = await loadProfile('sample');

  expect(profile).toMatchInlineSnapshot(`
    Object {
      "commissionPerOrder": 1,
      "dates": Object {
        "dates": Array [
          2021-12-01T05:00:00.000Z,
          2021-12-02T05:00:00.000Z,
          2021-12-03T05:00:00.000Z,
        ],
        "from": 2021-12-01T05:00:00.000Z,
        "to": 2021-12-03T05:00:00.000Z,
      },
      "initialBalance": 10000,
      "strategy": Object {
        "name": "sample",
        "source": "import {HandleTickParameters} from '../src/core';

    export const extraSymbols = ['SPY'];

    export function init() {}

    export function handleTick({tick, symbol, log}: HandleTickParameters) {
      log(symbol, tick);
    }
    ",
      },
      "symbols": Array [
        "MSFT",
      ],
    }
  `);
});

test('loading an invalid profile', async () => {
  await expect(() =>
    loadProfile('invalid'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"This profile does not exist"`);
});
