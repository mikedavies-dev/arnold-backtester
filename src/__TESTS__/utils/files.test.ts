import del from 'del';

import {fileExists, writeCsv, readCSV} from '../../utils/files';
import Env from '../../utils/env';

const lastLineTestFilename = Env.getUserPath('last-line-test.txt');

afterAll(async () => {
  await del(Env.getUserPath('TEMP*'));
});

test('file does not exist', async () => {
  expect(await fileExists('./invalid-file')).toBe(false);
});

test('file exists', async () => {
  expect(await fileExists(lastLineTestFilename)).toBe(true);
});

type ReadWriteTestRecord = {
  field1: number;
  field2: string;
  field3: number;
};

test('writing a new csv', async () => {
  const newFilename = Env.getUserPath('./TEMP_new_file.csv');

  const data = [
    {
      field1: 1,
      field2: 'test',
      field3: 123,
    },
    {
      field1: 2,
      field2: 'test',
      field3: 123,
    },
    {
      field1: 3,
      field2: 'test',
      field3: 123,
    },
  ];

  await writeCsv(
    newFilename,
    data,
    ['field1', 'field2', 'field3'],
    row => [row.field1, row.field2, row.field3],
    true,
  );

  const results1 = readCSV<ReadWriteTestRecord, ReadWriteTestRecord>(
    newFilename,
    row => row,
  );

  expect(results1).toMatchInlineSnapshot(`
    [
      {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 3,
        "field2": "test",
        "field3": 123,
      },
    ]
  `);

  // Add some data to an existing file
  await writeCsv(
    newFilename,
    data,
    ['field1', 'field2', 'field3'],
    row => [row.field1, row.field2, row.field3],
    false,
  );

  const results2 = readCSV<ReadWriteTestRecord, ReadWriteTestRecord>(
    newFilename,
    row => row,
  );

  expect(results2).toMatchInlineSnapshot(`
    [
      {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 3,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 3,
        "field2": "test",
        "field3": 123,
      },
    ]
  `);

  await writeCsv(
    newFilename,
    data,
    ['field1', 'field2', 'field3'],
    row => [row.field1, row.field2, row.field3],
    true,
  );

  const results3 = readCSV<ReadWriteTestRecord, ReadWriteTestRecord>(
    newFilename,
    row => row,
  );

  expect(results3).toMatchInlineSnapshot(`
    [
      {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      {
        "field1": 3,
        "field2": "test",
        "field3": 123,
      },
    ]
  `);
});

test('writing an empty csv should not add load invalid data', async () => {
  const filename = Env.getUserPath('./TEMP_empty.csv');
  await writeCsv(filename, [], ['header1', 'header2'], v => v, true);
  const data = readCSV(filename, v => v);
  expect(data.length).toBe(0);
});
