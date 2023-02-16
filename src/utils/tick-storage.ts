import {format, fromUnixTime} from 'date-fns';

import Env from './env';
import path from 'path';
import series from 'promise-series2';
import fs from 'fs/promises';
import del from 'del';

import {
  StoredTick,
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
): Promise<Array<StoredTick> | null> {
  // check if the file exists
  if (!(await fileExists(filename))) {
    return null;
  }

  // read the csv data
  const data = readCSV<RawTick, StoredTick>(filename, data => {
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
  return Env.getUserPath(
    `data/${symbol}/${format(date, 'yyyyMMdd')}_${type}.csv`,
  );
}

export async function loadTickForDate(
  symbol: string,
  time: Date,
  type: TickFileType,
): Promise<Array<StoredTick> | null> {
  const filename = formatDataFilename(symbol, time, type);
  return loadTickFile(filename);
}

export async function hasTickForDay(
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
  data: StoredTick[],
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

async function mergeTickData(symbol: string, date: Date) {
  const mergedData = (
    await Promise.all(
      [TickFileType.BidAsk, TickFileType.Trades].map(type =>
        loadTickForDate(symbol, date, type),
      ),
    )
  )
    .filter(notEmpty)
    .flat()
    .sort((m1, m2) => m1.dateTime.getTime() - m2.dateTime.getTime());

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
  date,
  dataProvider,
  log,
}: // log,
{
  symbols: string[];
  date: Date;
  dataProvider: DataProvider;
  log: LoggerCallback;
}) {
  const instruments = await instrumentLookup({
    provider: dataProvider.name,
    symbols,
  });

  return series(
    async instrument => {
      if (await hasTickForDay(instrument.symbol, date)) {
        return;
      }

      // delete existing data
      await del([
        formatDataFilename(instrument.symbol, date, TickFileType.BidAsk),
        formatDataFilename(instrument.symbol, date, TickFileType.Trades),
        formatDataFilename(instrument.symbol, date, TickFileType.Merged),
      ]);

      await dataProvider.downloadTickData({
        instrument,
        date,
        write: async (type, ticks) => {
          log(
            `${instrument.symbol} writing ${
              ticks.length
            } ${type} ticks @ ${format(date, 'yyyy-MM-dd HH:mm:ss')}`,
          );
          await writeTickData(instrument.symbol, date, type, ticks, false);
        },
        merge: async () => mergeTickData(instrument.symbol, date),
      });
    },
    5,
    instruments,
  );
}
