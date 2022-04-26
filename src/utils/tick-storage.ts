import {format, fromUnixTime} from 'date-fns';

import Env from './env';
import path from 'path';
import series from 'promise-series2';

import {
  Tick,
  RawTick,
  LoggerCallback,
  DataProvider,
  TickFileType,
  notEmpty,
} from '../core';
import {instrumentLookup} from './db';

import {formatDate, formatDateTime} from './dates';
import {fileExists, getLastLine, writeCsv, readCSV} from './files';

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
    `${symbol}_${format(date, 'yyyyMMdd')}_${type}.csv`,
  );
}

export async function loadTickForSymbolAndDate(
  symbol: string,
  date: Date,
  type: TickFileType,
): Promise<Array<Tick> | null> {
  const filename = formatDataFilename(symbol, date, type);
  return loadTickFile(filename);
}

export async function hasTickForSymbolAndDate(
  symbol: string,
  date: Date,
): Promise<boolean> {
  const filename = formatDataFilename(symbol, date, TickFileType.Merged);
  return fileExists(filename);
}

export async function writeTickData(
  symbol: string,
  date: Date,
  type: TickFileType,
  data: Tick[],
) {
  const outputFilename = formatDataFilename(symbol, date, type);
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
    true,
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
        loadTickForSymbolAndDate(symbol, date, type),
      ),
    )
  )
    .filter(notEmpty)
    .flat()
    .sort(sortTicksByDate);

  if (mergedData.length) {
    await writeTickData(symbol, date, TickFileType.Merged, mergedData);
  }
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

          log(
            `Downloading tick data for ${instrument.symbol} @ ${formatDate(
              date,
            )}`,
          );

          await dataProvider.downloadTickData({
            instrument,
            date,
            write: async (type, ticks) => {
              log(
                `Writing ${ticks.length} ${type} ticks for ${
                  instrument.symbol
                } @ ${formatDate(date)}`,
              );

              await writeTickData(instrument.symbol, date, type, ticks);
            },
            merge: async () => mergeTickData(instrument.symbol, date),
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

export async function getLatestTemporaryTickDate(
  symbol: string,
  type: TickFileType,
  date: Date,
) {
  const filename = formatDataFilename(symbol, date, type);
  const lastLine = await getLastLine(filename);
  const values = lastLine.split(',');

  if (!values) {
    return null;
  }

  return new Date(Number(values[0]));
}
