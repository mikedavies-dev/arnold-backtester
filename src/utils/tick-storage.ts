import LineByLine from 'n-readlines';
import {format, fromUnixTime} from 'date-fns';
import * as Fs from 'fs/promises';
import Env from './env';
import path from 'path';
import series from 'promise-series2';

import {Tick, RawTick, LoggerCallback, DataProvider} from '../core';
import {instrumentLookup} from './db';

import {formatDate, formatDateTime} from './dates';

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

function writeCsv<CsvType extends Record<string, any>>(
  outputFilename: string,
  data: CsvType[],
  headers: string[],
  transform: (entry: CsvType) => (string | number)[],
) {
  const fileData = data.map(transform).join('\n');
  return Fs.appendFile(outputFilename, `${headers.join(',')}\n${fileData}\n`);
}

export async function loadTickFile(
  filename: string,
): Promise<Array<Tick> | null> {
  // check if the file exists
  if (!(await fileExists(filename))) {
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

function formatDataFilename(symbol: string, date: Date) {
  return path.join(
    Env.DATA_FOLDER,
    `${symbol}_${format(date, 'yyyyMMdd')}_merged.csv`,
  );
}

export async function loadTickForSymbolAndDate(
  symbol: string,
  date: Date,
): Promise<Array<Tick> | null> {
  const filename = formatDataFilename(symbol, date);
  return loadTickFile(filename);
}

export async function hasTickForSymbolAndDate(
  symbol: string,
  date: Date,
): Promise<boolean> {
  const filename = formatDataFilename(symbol, date);
  return fileExists(filename);
}

export async function ensureTickDataIsAvailable({
  symbols,
  dates,
  dataProvider,
  log,
}: {
  symbols: string[];
  dates: Date[];
  dataProvider: DataProvider;
  log: LoggerCallback;
}) {
  const instruments = await instrumentLookup({
    provider: dataProvider.name,
    symbols,
  });

  return series(
    instrument => {
      return series(
        async date => {
          if (await hasTickForSymbolAndDate(instrument.symbol, date)) {
            return;
          }
          // download the data
          log(
            `Downloading tick data for ${instrument.symbol} @ ${formatDate(
              date,
            )}`,
          );

          await dataProvider.downloadTickData(instrument, date, async ticks => {
            log(
              `Writing ${ticks.length} ticks for ${
                instrument.symbol
              } @ ${formatDate(date)}`,
            );

            const outputFilename = formatDataFilename(instrument.symbol, date);
            await writeCsv(
              outputFilename,
              ticks,
              ['time', 'index', 'dateTime', 'symbol', 'type', 'value', 'size'],
              record => [
                record.time,
                record.index,
                formatDateTime(record.dateTime),
                record.symbol,
                record.type,
                record.value,
                record.size,
              ],
            );
          });
        },
        1,
        dates,
      );
    },
    4,
    instruments,
  );
}
