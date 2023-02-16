import * as Fs from 'fs/promises';
import LineByLine from 'n-readlines';

export async function fileExists(path: string) {
  try {
    await Fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function writeCsv<CsvType extends Record<string, any>>(
  outputFilename: string,
  data: CsvType[],
  headers: string[],
  transform: (entry: CsvType) => (string | number)[],
  overwrite: boolean,
) {
  const exists = await fileExists(outputFilename);

  const rows = [
    ...(!exists || overwrite ? [headers.join(',')] : []),
    ...data.map(transform),
  ];

  const output = `${rows.join('\n')}\n`;
  const operation =
    overwrite || !exists
      ? Fs.writeFile(outputFilename, output)
      : Fs.appendFile(outputFilename, output);

  await operation;
}

function isNumeric(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n); // eslint-disable-line
}

export function readCSV<
  CsvType extends Record<string, string | number>,
  ReturnType extends Record<string, any>,
>(csvPath: string, transform: (data: CsvType) => ReturnType) {
  const liner = new LineByLine(csvPath);

  const data: Array<ReturnType> = [];
  let index = 0;
  let headers: Array<string> = [];
  let line: Buffer | boolean = false;

  while ((line = liner.next())) {
    const parts = line.toString('ascii').split(',');

    index += 1;

    if (index === 1) {
      headers = parts;
    } else {
      const row = parts.reduce((acc, value, ix) => {
        acc[headers[ix]] = isNumeric(value) ? parseFloat(value) : value;
        return acc;
      }, {} as Record<string, string | number>);

      data.push(transform(row as CsvType));
    }
  }

  return data;
}
