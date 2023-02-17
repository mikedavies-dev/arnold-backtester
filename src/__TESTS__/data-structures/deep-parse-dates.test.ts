import {deepParseDates} from '../../utils/data-structures';

test('deep parse dates', () => {
  const src = {
    id: '61eee35d5f20b1b5c542430c',
    date1: '2022-01-24T17:35:25.922Z',
    invalidDate1: '2022-01-24',
    nested1: {
      date1: '2022-01-24T17:35:25.922Z',
    },
  };

  expect(src).toMatchInlineSnapshot(`
    {
      "date1": "2022-01-24T17:35:25.922Z",
      "id": "61eee35d5f20b1b5c542430c",
      "invalidDate1": "2022-01-24",
      "nested1": {
        "date1": "2022-01-24T17:35:25.922Z",
      },
    }
  `);

  // Convert matching strings to dates
  deepParseDates(src);

  expect(src).toMatchInlineSnapshot(`
    {
      "date1": 2022-01-24T17:35:25.922Z,
      "id": "61eee35d5f20b1b5c542430c",
      "invalidDate1": 2022-01-24T05:00:00.000Z,
      "nested1": {
        "date1": 2022-01-24T17:35:25.922Z,
      },
    }
  `);
});

test('deep parse dates on null object', () => {
  const src = null;
  deepParseDates(src);
  expect(src).toMatchInlineSnapshot(`null`);
});
