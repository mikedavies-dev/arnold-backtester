import {runBacktestController} from '../../backtest/controller';

test('running the controller with an invalid profile', async () => {
  await expect(
    runBacktestController({
      profile: 'samples',
      log: () => {},
      symbol: null,
      date: null,
      keep: false,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"invalid-profile"`);
});
