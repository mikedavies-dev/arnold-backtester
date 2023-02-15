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
} from '../core';
import {instrumentLookup} from './db';

import {formatDateTime} from './dates';
import {fileExists, writeCsv, readCSV} from './files';
import {mergeAndDistributeArrays} from './data-structures';

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
    `data/${symbol}/${format(date, 'yyyyMMdd')}/${format(
      date,
      'HHmm',
    )}_${type}.csv`,
  );
}

export async function loadTickForMinute(
  symbol: string,
  time: Date,
  type: TickFileType,
): Promise<Array<StoredTick> | null> {
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
  data: StoredTick[],
  overwrite: boolean,
) {
  if (!data.length) {
    return;
  }
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

// export function sortTicksByDate(row1: Tick, row2: Tick) {
//   // Sort on both index and time so we don't loose th original order
//   // if we have multiple values per second
//   const val1 = row1.time * 1000000 + row1.index;
//   const val2 = row2.time * 1000000 + row2.index;

//   return val1 - val2;
// }

async function mergeTickData(symbol: string, date: Date) {
  const [bidAsk, trades] = await Promise.all(
    [TickFileType.BidAsk, TickFileType.Trades].map(type =>
      loadTickForMinute(symbol, date, type),
    ),
  );

  // Merge each second separately so we get an even distribution of trades/quotes
  const merged: StoredTick[] = [];

  /*
  IB don't give us millisecond data on bid/ask/trade data and because we get a lot more
  bid/ask data than trades if we try to merge them simply based on time then we will
  have a lot more bid/ask data at the end of each second.

  To avoid this we merge the data by second and then distribute the data evenly across the
  entire second. This isn't ideal but it's as close as we can get without having millisecond
  data.
  */

  for (let second = 0; second < 60; second += 1) {
    const array1 =
      bidAsk?.filter(t => t.dateTime.getSeconds() === second) || [];

    const array2 =
      trades?.filter(t => t.dateTime.getSeconds() === second) || [];

    merged.splice(
      merged.length,
      0,
      ...mergeAndDistributeArrays(array1, array2),
    );
  }

  await writeTickData(symbol, date, TickFileType.Merged, merged, true);

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
  log,
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

      // delete existing data
      await del([
        formatDataFilename(instrument.symbol, minute, TickFileType.BidAsk),
        formatDataFilename(instrument.symbol, minute, TickFileType.Trades),
        formatDataFilename(instrument.symbol, minute, TickFileType.Merged),
      ]);

      await dataProvider.downloadTickData({
        instrument,
        minute,
        write: async (type, ticks) => {
          log(
            `${instrument.symbol} writing ${
              ticks.length
            } ${type} ticks @ ${format(minute, 'yyyy-MM-dd HH:mm:ss')}`,
          );
          await writeTickData(instrument.symbol, minute, type, ticks, false);
        },
        merge: async () => mergeTickData(instrument.symbol, minute),
      });
    },
    4,
    instruments,
  );
}
