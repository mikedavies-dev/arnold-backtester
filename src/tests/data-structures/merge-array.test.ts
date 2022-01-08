import {mergeSortedArrays} from '../../utils/data-structures';

const sorter = (v1: number, v2: number) => v1 - v2;

test('merge two arrays', () => {
  const sorted = mergeSortedArrays(
    [
      [1, 2, 4],
      [4, 5, 6],
    ],
    (v1, v2) => v1 - v2,
  );

  expect(sorted).toMatchInlineSnapshot(`
    Array [
      1,
      2,
      4,
      4,
      5,
      6,
    ]
  `);
});

test('merge three arrays', () => {
  const sorted = mergeSortedArrays(
    [
      [1, 2, 4, 1, 10, 9, 14, 4, 6].sort(sorter),
      [4, 5, 6, 1, 77, 32, 6, 0, 12].sort(sorter),
      [88, 2, 11, 23, 13, 77, 82, 12].sort(sorter),
    ],
    sorter,
  );

  expect(sorted).toMatchInlineSnapshot(`
    Array [
      0,
      1,
      1,
      1,
      2,
      2,
      4,
      4,
      4,
      5,
      6,
      6,
      6,
      9,
      10,
      11,
      12,
      12,
      13,
      14,
      23,
      32,
      77,
      77,
      82,
      88,
    ]
  `);
});
