import {Schema, model} from 'mongoose';
import {Position} from '../backtest/broker';
import {Profile} from '../utils/profile';

type MongoObjectId = {
  toString(): string;
};

export type DbBacktest = {
  _id?: MongoObjectId;
  createdAt: Date;
  positions: Array<Position>;
  profile: Profile;
};

const Backtest = new Schema<DbBacktest>({
  createdAt: Date,
  positions: [
    {
      symbol: String,
      orders: [
        {
          parentId: Number,
          // https://stackoverflow.com/a/15100043/1167223
          type: {type: String},
          symbol: String,
          action: String,
          shares: Number,
          id: Number,
          openedAt: Date,
          state: String,
          filledAt: Date,
          avgFillPrice: Number,
        },
      ],
      size: Number,
      data: {},
      closeReason: String,
      isClosing: Boolean,
    },
  ],
  profile: {
    strategy: {
      name: String,
      source: String,
    },
    dates: {
      from: Date,
      to: Date,
      dates: [Date],
    },
    symbols: [String],
    threads: Number,
    initialBalance: Number,
    commissionPerOrder: Number,
  },
});

export async function registerMongooseModels() {
  await model('Backtest', Backtest, 'backtests');
}
