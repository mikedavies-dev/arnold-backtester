import mongoose from 'mongoose';
import {startOfDay, endOfDay} from 'date-fns';

// Register the models
import {
  DbBacktest,
  DbTimeSeriesBar,
  registerMongooseModels,
} from '../models/models';

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

export async function listAvailablePeriodsForSymbolAndDate(
  symbol: string,
  date: Date,
): Promise<string[]> {
  const TimeSeriesBar = mongoose.model<DbTimeSeriesBar>('TimeSeriesBar');

  const types = await TimeSeriesBar.aggregate<{
    _id: string;
    count: number;
  }>([
    {
      $match: {
        symbol,
        time: {
          $gte: startOfDay(date),
          $lte: endOfDay(date),
        },
      },
    },
    {
      $group: {
        _id: '$period',
        count: {$sum: 1},
      },
    },
  ]);

  return types.map(t => t._id);
}
