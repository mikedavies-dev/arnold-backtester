import {loadBacktestProfile, profileExists} from '../../utils/profile';

test('that a valid profile exists', async () => {
  const exists = await profileExists('sample');
  expect(exists).toBeTruthy();
});

test('that an invalid profile does exists', async () => {
  const exists = await profileExists('invalid');
  expect(exists).toBeFalsy();
});

test('load a valid profile', async () => {
  const profile = await loadBacktestProfile('sample');

  expect(profile.symbols[0]).toBe('MSFT');
  expect(profile.initialBalance).toBe(10000);
});

test('loading an invalid profile', async () => {
  await expect(() =>
    loadBacktestProfile('invalid'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"This profile does not exist"`);
});

test('loading an valid profile with invalid strategy', async () => {
  await expect(() =>
    loadBacktestProfile('valid-with-invalid-strategy'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Test strategy not found invalid"`,
  );
});
