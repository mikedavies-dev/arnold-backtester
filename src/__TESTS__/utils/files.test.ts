import path from 'path';
import {fileExists, getLastLine} from '../../utils/files';
import Env from '../../utils/env';

const lastLineTestFilename = path.join(
  Env.DATA_FOLDER,
  '../last-line-test.txt',
);

test('file does not exist', async () => {
  expect(await fileExists('./invalid-file')).toBe(false);
});

test('file exists', async () => {
  expect(await fileExists(lastLineTestFilename)).toBe(true);
});

test('get last line', async () => {
  expect(await getLastLine(lastLineTestFilename)).toMatch(`line`);
});
