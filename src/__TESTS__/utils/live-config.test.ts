import Env from '../../utils/env';
import {getLiveConfig} from '../../utils/live-config';

describe('live config tests', () => {
  test('get live config', async () => {
    const config = await getLiveConfig();

    expect(config.profiles.length).toBeGreaterThan(0);
    expect(config.profiles[0].accountSize).toBe(1000);
    expect(config.profiles[0].enabled).toBe(true);
    expect(config.profiles[0].name).toBe('Sample Strategy');
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
