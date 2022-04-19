import mongoose from 'mongoose';

// Register the models
import {registerMongooseModels} from '../models/models';

import {
  Instrument,
  Bar,
  TimeSeriesPeriod,
  DbBacktest,
  DbTimeSeriesBar,
  DbTimeSeriesDataAvailability,
  DbInstrument,
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

  await TimeSeriesBar.insertMany(
    bars.map(bar => ({
      ...bar,
      symbol,
      period,
    })),
  );
}

export async function getDataAvailableTo(
  symbol: string,
  period: TimeSeriesPeriod,
): Promise<Date | undefined> {
  const TimeSeriesDataAvailability =
    mongoose.model<DbTimeSeriesDataAvailability>('TimeSeriesDataAvailability');

  const record = await TimeSeriesDataAvailability.findOne({
    symbol,
    period,
  });

  return record?.dataAvailableTo;
}

export async function updateDataAvailableTo(
  symbol: string,
  period: TimeSeriesPeriod,
  dataAvailableTo: Date,
): Promise<Date | undefined> {
  const TimeSeriesDataAvailability =
    mongoose.model<DbTimeSeriesDataAvailability>('TimeSeriesDataAvailability');

  const record = await TimeSeriesDataAvailability.findOneAndUpdate(
    {
      symbol,
      period,
    },
    {
      $set: {
        dataAvailableTo,
      },
    },
    {
      upsert: true,
    },
  );

  return record?.dataAvailableTo;
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
