import {Schema, model} from 'mongoose';

export type Backtest = {
  startedAt: Date;
};

const Backtest = new Schema<Backtest>({
  startedAt: Date,
});

export async function registerMongooseModels() {
  await model('Backtest', Backtest, 'backtests');
}
