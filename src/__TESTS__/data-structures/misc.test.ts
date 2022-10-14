import {notEmpty} from '../../core';

test('not empty filters an array', () => {
  const values = [1, 2, 3, 4, null, 5, 6, 7, undefined, 8, 9, 10];
  const filtered = values.filter(notEmpty);
  expect(filtered).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
