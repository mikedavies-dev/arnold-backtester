import LineByLine from 'n-readlines';
import {format, fromUnixTime} from 'date-fns';
import * as Fs from 'fs/promises';

type RawTick = {
  time: number;
  index: number;
  dateTime: string;
  symbol: string;
  type: 'TRADE' | 'BID' | 'ASK';
  size: number;
  value: number;
};

export type Tick = {
  time: number;
  index: number;
  dateTime: Date;
  symbol: string;
  type: 'TRADE' | 'BID' | 'ASK';
  size: number;
  value: number;
};

export async function fileExists(path: string) {
  try {
    await Fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function isNumeric(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n); // eslint-disable-line
}

function readCSV<
  CsvType extends Record<string, string | number>,
  ReturnType extends Record<string, any>,
>(csvPath: string, transform: (data: CsvType) => ReturnType) {
  const liner = new LineByLine(csvPath);

  const data: Array<ReturnType> = [];
  let index = 0;
  let headers: Array<string> = [];
  let line: Buffer | boolean = false;

  while ((line = liner.next())) {
    if (!line) {
      break;
    }

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

export async function loadTsData(
  symbol: string,
  date: Date,
): Promise<Array<Tick> | null> {
  const filename = `./data/${symbol}_${format(date, 'yyyyMMdd')}_merged.csv`;

  // check if the file exists
  if (!fileExists(filename)) {
    return null;
  }

  // read the csv data
  const data = readCSV<RawTick, Tick>(filename, data => {
    return {
      time: data.time,
      index: data.index,
      dateTime: fromUnixTime(data.time),
      symbol: data.symbol,
      type: data.type,
      size: data.size,
      value: data.value,
    };
  });

  return data;
}
