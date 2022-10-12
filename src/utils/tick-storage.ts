import {format, fromUnixTime} from 'date-fns';

import Env from './env';
import path from 'path';
import series from 'promise-series2';
import fs from 'fs/promises';
import del from 'del';

import {
  Tick,
  RawTick,
  LoggerCallback,
  DataProvider,
  TickFileType,
  notEmpty,
} from '../core';
import {instrumentLookup} from './db';

import {formatDateTime} from './dates';
import {fileExists, writeCsv, readCSV} from './files';

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

function formatDataFilename(symbol: string, date: Date, type: TickFileType) {
  return path.join(
    Env.DATA_FOLDER,
    `${symbol}/${format(date, 'yyyyMMdd')}/${format(date, 'HHmm')}_${type}.csv`,
  );
}

export async function loadTickForMinute(
  symbol: string,
  time: Date,
  type: TickFileType,
): Promise<Array<Tick> | null> {
  const filename = formatDataFilename(symbol, time, type);
  return loadTickFile(filename);
}

export async function hasTickForMinute(
  symbol: string,
  date: Date,
): Promise<boolean> {
  const filename = formatDataFilename(symbol, date, TickFileType.Merged);
  return fileExists(filename);
}

export async function writeTickData(
  symbol: string,
  time: Date,
  type: TickFileType,
  data: Tick[],
  overwrite: boolean,
) {
  const outputFilename = formatDataFilename(symbol, time, type);

  // Ensure that the path exists
  await fs.mkdir(path.dirname(outputFilename), {recursive: true});

  await writeCsv(
    outputFilename,
    data,
    ['time', 'index', 'dateTime', 'symbol', 'type', 'value', 'size'],
    tick => [
      tick.time,
      tick.index,
      formatDateTime(tick.dateTime),
      tick.symbol,
      tick.type,
      tick.value,
      tick.size,
    ],
    overwrite,
  );
}

export function sortTicksByDate(row1: Tick, row2: Tick) {
  // Sort on both index and time so we don't loose th original order
  // if we have multiple values per second
  const val1 = row1.time * 1000000 + row1.index;
  const val2 = row2.time * 1000000 + row1.index;

  return val1 - val2;
}

async function mergeTickData(symbol: string, date: Date) {
  const mergedData = (
    await Promise.all(
      [TickFileType.BidAsk, TickFileType.Trades].map(type =>
        loadTickForMinute(symbol, date, type),
      ),
    )
  )
    .filter(notEmpty)
    .flat()
    .sort(sortTicksByDate);

  await writeTickData(symbol, date, TickFileType.Merged, mergedData, true);

  // Delete temp data after merging
  await Promise.all(
    [TickFileType.BidAsk, TickFileType.Trades].map(type =>
      del(formatDataFilename(symbol, date, type)),
    ),
  );
}

export async function ensureTickDataIsAvailable({
  symbols,
  minute,
  dataProvider,
}: // log,
{
  symbols: string[];
  minute: Date;
  dataProvider: DataProvider;
  log: LoggerCallback;
}) {
  const instruments = await instrumentLookup({
    provider: dataProvider.name,
    symbols,
  });

  return series(
    async instrument => {
      if (await hasTickForMinute(instrument.symbol, minute)) {
        return;
      }

      await dataProvider.downloadTickData({
        instrument,
        minute,
        write: async (type, ticks) => {
          await writeTickData(instrument.symbol, minute, type, ticks, false);
        },
        merge: async () => mergeTickData(instrument.symbol, minute),
      });
    },
    4,
    instruments,
  );
}
