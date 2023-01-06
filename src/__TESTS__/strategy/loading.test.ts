import {loadLiveStrategy, loadBacktestStrategy} from '../../utils/strategy';

describe('test strategy loading', () => {
  test('loading a live strategy', async () => {
    const Strategy = await loadLiveStrategy('sample');

    expect(typeof Strategy.source).toBe('string');
    expect(Strategy.source.length).not.toBe('');
  });

  test('loading a test strategy', async () => {
    const Strategy = await loadBacktestStrategy('sample');

    expect(typeof Strategy.source).toBe('string');
    expect(Strategy.source.length).not.toBe('');
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
