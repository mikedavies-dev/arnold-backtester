import {ratio, incIf, initArrayOfSize} from '../../utils/logic';

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

test('initArrayOfSize', () => {
  expect(initArrayOfSize(0, 1)).toStrictEqual([]);
  expect(initArrayOfSize(1, 1)).toStrictEqual([1]);
  expect(initArrayOfSize(10, 'Hi')).toMatchInlineSnapshot(`
    Array [
      "Hi",
      "Hi",
      "Hi",
      "Hi",
      "Hi",
      "Hi",
      "Hi",
      "Hi",
      "Hi",
      "Hi",
    ]
  `);

  expect(initArrayOfSize(10, {val1: 1, val2: 'test '})).toMatchInlineSnapshot(`
    Array [
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
      Object {
        "val1": 1,
        "val2": "test ",
      },
    ]
  `);

  const testArray = initArrayOfSize(10, {val1: 1, val2: 'test'});
  // This should not update the other one!
  testArray[0].val1 = 10;

  // value at index 1 should not have been changed
  expect(testArray[1]).toMatchInlineSnapshot(`
    Object {
      "val1": 1,
      "val2": "test",
    }
  `);
});
