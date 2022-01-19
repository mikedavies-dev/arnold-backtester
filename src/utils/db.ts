import mongoose from 'mongoose';

// Register the models
import {Backtest, registerMongooseModels} from '../models/models';

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

export async function storeBacktestResults(results: BacktestResults) {}

export function getBacktests() {
  const Backtest = mongoose.model<Backtest>('Backtest');
  return Backtest.find();
}
