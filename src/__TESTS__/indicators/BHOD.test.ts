import {hodLevel} from '../../indicators/BHOD';

describe('test BHOD helper functions', () => {
  test('get the level from a high', () => {
    expect(hodLevel(100)).toBe(100);
    expect(hodLevel(100.1)).toBe(100);
    expect(hodLevel(100.3)).toBe(100.3);
    expect(hodLevel(99.9)).toBe(100);
    expect(hodLevel(99.7)).toBe(99.7);
  });
});
