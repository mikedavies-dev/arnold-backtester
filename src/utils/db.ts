import mongoose from 'mongoose';

// mongoose.set('debug', true);

import {
  isBefore,
  addDays,
  subDays,
  isSameDay,
  isAfter,
  getUnixTime,
  startOfDay,
  endOfDay,
} from 'date-fns';

// Register the models
import {registerMongooseModels} from '../models/models';
import {formatBarTime} from './bars';

import {
  Instrument,
  Bar,
  TimeSeriesPeriod,
  DbBacktest,
  DbTimeSeriesBar,
  DbTimeSeriesDataAvailability,
  DbInstrument,
  DbLivePosition,
  TimeSeriesPeriodToPeriod,
  Bars,
  Order,
  OrderExecution,
} from '../core';

import Env from './env';
import {BacktestResults} from '../backtest/controller';

export async function connect() {
  // Connect to the db
  await mongoose.connect(Env.MONGO_CONNECTION_STRING);

  // Register the models
  await registerMongooseModels();

  // Wait for the indexes to build
  await Promise.all(
    mongoose
      .modelNames()
      .map((model: any) => mongoose.model(model).ensureIndexes()),
  );
}

export async function disconnect() {
  await mongoose.disconnect();
}

export async function resetDatabase() {
  // Hard code to test db!!
  await mongoose.connect(Env.MONGO_CONNECTION_STRING);

  // Drop the database, it will be re-created later
  await mongoose.connection.db.dropDatabase();

  // Close the connection
  await mongoose.disconnect();
}

export async function storeBacktestResults(results: BacktestResults) {
  const Backtest = mongoose.model<DbBacktest>('Backtest');

  await Backtest.create<DbBacktest>({
    createdAt: results.createdAt,
    positions: results.positions,
    profile: results.profile,
  });
}

export async function getBacktests(): Promise<Array<DbBacktest>> {
  const Backtest = mongoose.model<DbBacktest>('Backtest');
  return (await Backtest.find().sort({_id: -1})).map(r => r.toObject());
}

export async function getBacktest(id: string): Promise<DbBacktest | null> {
  const Backtest = mongoose.model<DbBacktest>('Backtest');
  const backtest = await Backtest.findById(id);
  return backtest;
}

export async function storeSeries(
  symbol: string,
  period: TimeSeriesPeriod,
  bars: Bar[],
) {
  const TimeSeriesBar = mongoose.model<DbTimeSeriesBar>('TimeSeriesBar');

  // Insert with upsert to avoid duplicates
  await TimeSeriesBar.bulkWrite(
    bars.map(bar => ({
      updateOne: {
        filter: {
          symbol,
          period,
          time: bar.time,
        },
        update: {
          $set: {
            ...bar,
            symbol,
            period,
          },
        },
        upsert: true,
      },
    })),
  );
}

export async function hasRequestedData(
  symbol: string,
  period: TimeSeriesPeriod,
  date: Date,
) {
  const TimeSeriesDataAvailability =
    mongoose.model<DbTimeSeriesDataAvailability>('TimeSeriesDataAvailability');

  const first = await TimeSeriesDataAvailability.findOne({
    symbol,
    period,
    dateRequested: date,
  });

  return Boolean(first);
}

export async function recordDataHasBeenRequested(
  symbol: string,
  period: TimeSeriesPeriod,
  dateRequested: Date,
): Promise<void> {
  const TimeSeriesDataAvailability =
    mongoose.model<DbTimeSeriesDataAvailability>('TimeSeriesDataAvailability');

  await TimeSeriesDataAvailability.findOneAndUpdate(
    {
      symbol,
      period,
      dateRequested,
    },
    {
      $set: {
        dateRequested,
      },
    },
    {
      upsert: true,
    },
  );
}

export async function findNonRequestedRangeForPeriod(
  symbol: string,
  period: TimeSeriesPeriod,
  from: Date,
  to: Date,
) {
  // Find the first date that we have requested data for
  let firstDayWithoutRequest: Date | null = null;

  for (
    let day = from;
    isBefore(day, to) || isSameDay(day, to);
    day = addDays(day, 1)
  ) {
    if (!(await hasRequestedData(symbol, period, day))) {
      firstDayWithoutRequest = day;
      break;
    }
  }

  if (!firstDayWithoutRequest) {
    return null;
  }

  // Find the last date that we have requested data for
  let lastDayWithoutRequest: Date | null = null;

  for (
    let day = to;
    isAfter(day, from) || isSameDay(day, from);
    day = subDays(day, 1)
  ) {
    if (!(await hasRequestedData(symbol, period, day))) {
      lastDayWithoutRequest = day;
      break;
    }
  }

  // if (!lastDayWithoutRequest) {
  //   return null;
  // }

  return {
    from: firstDayWithoutRequest as Date,
    to: lastDayWithoutRequest as Date,
  };
}

export async function instrumentLookup({
  provider,
  symbols,
}: {
  provider: string;
  symbols: string[];
}) {
  const Instrument = mongoose.model<DbInstrument>('Instrument');

  return Instrument.find({
    provider,
    symbol: {$in: symbols},
  });
}

export async function getInstrument({
  provider,
  symbol,
}: {
  provider: string;
  symbol: string;
}) {
  const Instrument = mongoose.model<DbInstrument>('Instrument');

  return Instrument.findOne({
    provider,
    symbol: symbol,
  });
}

export async function storeInstrument({
  provider,
  instrument,
}: {
  provider: string;
  instrument: Instrument;
}) {
  const Instrument = mongoose.model<DbInstrument>('Instrument');

  const existing = await Instrument.findOne({
    provider,
    symbol: instrument.symbol,
  });

  // Update the existing record
  if (existing) {
    await Instrument.findByIdAndUpdate(existing._id, {
      $set: {
        name: instrument.name,
        data: instrument.data,
      },
    });
  } else {
    await Instrument.create({
      provider,
      ...instrument,
    });
  }
}

function databaseToBars(bars: DbTimeSeriesBar[]): Bar[] {
  return bars.map(bar => {
    return {
      time: formatBarTime(
        TimeSeriesPeriodToPeriod[bar.period],
        getUnixTime(bar.time),
      ),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    };
  });
}

export async function loadBars(
  symbol: string,
  period: TimeSeriesPeriod,
  until: Date,
  count: number,
): Promise<Bar[]> {
  const TimeSeriesBar = mongoose.model<DbTimeSeriesBar>('TimeSeriesBar');

  return databaseToBars(
    await TimeSeriesBar.find({
      symbol,
      period,
      time: {$lt: until},
    })
      .sort({time: -1})
      .limit(count),
  ).reverse();
}

export async function loadMinuteDataForDate(symbol: string, date: Date) {
  const TimeSeriesBar = mongoose.model<DbTimeSeriesBar>('TimeSeriesBar');

  const bars = databaseToBars(
    await TimeSeriesBar.find({
      symbol,
      period: 'm1',
      time: {
        $gte: date,
        $lt: addDays(date, 1),
      },
    }).sort({
      time: 1,
    }),
  );

  return bars.reduce((map, bar) => {
    map[bar.time] = bar;
    return map;
  }, {} as {[time: string]: Bar});
}

export async function loadTrackerBars(
  symbol: string,
  until: Date,
  count: number,
): Promise<Bars> {
  return {
    m1: await loadBars(symbol, 'm1', until, count),
    m5: await loadBars(symbol, 'm5', until, count),
    m60: await loadBars(symbol, 'm60', until, count),
    daily: await loadBars(symbol, 'daily', until, count),
  };
}

export async function loadOpenPositions() {
  const Position = mongoose.model<DbLivePosition>('LivePosition');
  return Position.find({
    openedAt: {$gt: startOfDay(new Date())},
    closedAt: null,
  });
}

export async function loadPositionsForDateRange(from: Date, to: Date) {
  const Position = mongoose.model<DbLivePosition>('LivePosition');
  return Position.find({
    openedAt: {$gte: startOfDay(from), $lt: endOfDay(to)},
  });
}

export async function loadTodayPositions() {
  return loadPositionsForDateRange(new Date(), new Date());
}

export async function createLivePosition(position: DbLivePosition) {
  const LivePosition = mongoose.model<DbLivePosition>('LivePosition');
  await LivePosition.create({
    ...position,
    // don't add orders because it can cause duplicates, we should only
    // add orders via createLiveOrder
    orders: [],
  });
}

export async function updateLiveOrder(
  externalId: string,
  orderId: number,
  updates: Partial<Order>,
) {
  const Position = mongoose.model<DbLivePosition>('LivePosition');

  const set = Object.keys(updates).reduce((acc, key) => {
    acc[`orders.$.${key}`] = updates[key as keyof Order];
    return acc;
  }, {} as Record<string, any>);

  await Position.findOneAndUpdate(
    {
      externalId,
      'orders.id': orderId,
    },
    {
      $set: set,
    },
  );
}

export async function createLiveOrder(externalId: string, order: Order) {
  const Position = mongoose.model<DbLivePosition>('LivePosition');

  await Position.findOneAndUpdate(
    {
      externalId,
    },
    {
      $push: {
        orders: order,
      },
    },
  );
}

export async function updateLiveOrderExecution(
  externalId: string,
  orderId: number,
  execId: string,
  execution: OrderExecution,
) {
  const Position = mongoose.model<DbLivePosition>('LivePosition');

  await Position.updateOne(
    {
      externalId,
      'orders.id': orderId,
    },
    {
      $set: {
        [`orders.$.executions.${execId}`]: execution,
      },
    },
  );
}

export async function updatePositionClosing(
  externalId: string,
  reason: string | null,
) {
  const Position = mongoose.model<DbLivePosition>('LivePosition');

  await Position.findOneAndUpdate(
    {
      externalId,
    },
    {
      $set: {
        isClosing: true,
        closeReason: reason,
      },
    },
  );
}

export async function closePosition(externalId: string, closedAt: Date) {
  const Position = mongoose.model<DbLivePosition>('LivePosition');

  await Position.findOneAndUpdate(
    {
      externalId,
    },
    {
      $set: {
        isClosing: false,
        closedAt,
      },
    },
  );
}
