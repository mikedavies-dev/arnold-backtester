import {deDuplicateObjectArray} from '../../utils/data-structures';

test('deduplicate object array', () => {
  const source = [
    {
      key: '1',
      value1: 1,
      value2: 2,
    },
    {
      key: '1',
      value1: 1,
      value2: 2,
    },
    {
      key: '2',
      value1: 1,
      value2: 2,
    },
    {
      key: '3',
      value1: 1,
      value2: 2,
    },
  ];

  const deDuplicated = deDuplicateObjectArray(source, v => v.key);
  expect(deDuplicated.length).toBe(3);
  expect(deDuplicated).toMatchInlineSnapshot(`
    Array [
      Object {
        "key": "1",
        "value1": 1,
        "value2": 2,
      },
      Object {
        "key": "2",
        "value1": 1,
        "value2": 2,
      },
      Object {
        "key": "3",
        "value1": 1,
        "value2": 2,
      },
    ]
  `);
});
