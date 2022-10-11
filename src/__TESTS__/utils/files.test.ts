import path from 'path';
import del from 'del';

import {fileExists, writeCsv, readCSV} from '../../utils/files';
import Env from '../../utils/env';

const lastLineTestFilename = path.join(
  Env.DATA_FOLDER,
  '../last-line-test.txt',
);

afterAll(async () => {
  await del(path.join(Env.DATA_FOLDER, './TEMP*'));
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
  const newFilename = path.join(Env.DATA_FOLDER, './TEMP_new_file.csv');

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

  const results1 = await readCSV<ReadWriteTestRecord, ReadWriteTestRecord>(
    newFilename,
    row => row,
  );

  expect(results1).toMatchInlineSnapshot(`
    Array [
      Object {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      Object {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      Object {
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

  const results2 = await readCSV<ReadWriteTestRecord, ReadWriteTestRecord>(
    newFilename,
    row => row,
  );

  expect(results2).toMatchInlineSnapshot(`
    Array [
      Object {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      Object {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      Object {
        "field1": 3,
        "field2": "test",
        "field3": 123,
      },
      Object {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      Object {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      Object {
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

  const results3 = await readCSV<ReadWriteTestRecord, ReadWriteTestRecord>(
    newFilename,
    row => row,
  );

  expect(results3).toMatchInlineSnapshot(`
    Array [
      Object {
        "field1": 1,
        "field2": "test",
        "field3": 123,
      },
      Object {
        "field1": 2,
        "field2": "test",
        "field3": 123,
      },
      Object {
        "field1": 3,
        "field2": "test",
        "field3": 123,
      },
    ]
  `);
});
