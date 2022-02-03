import {ratio, incIf} from '../../utils/logic';

test('ratio', async () => {
  expect(ratio(10, 0)).toBe(0);
  expect(ratio(1, 1)).toBe(1);
  expect(ratio(5, 10)).toBe(0.5);
});

test('incIf', async () => {
  expect(incIf(true, 1)).toBe(2);
  expect(incIf(true, 2)).toBe(3);
  expect(incIf(false, 2)).toBe(2);

  // Override increment amount
  expect(incIf(true, 1, 100)).toBe(101);
});
