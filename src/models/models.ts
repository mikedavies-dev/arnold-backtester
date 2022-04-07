import {Schema, model} from 'mongoose';
import {Position} from '../backtest/broker';
import {Profile} from '../utils/profile';
import {TimeSeriesPeriod} from '../core';
import {Bar} from '../utils/tracker';

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

export type DbTimeSeriesBar = {
  _id?: MongoObjectId;
  symbol: string;
  period: TimeSeriesPeriod;
} & Bar;

const TimeSeriesBar = new Schema<DbTimeSeriesBar>({
  symbol: String,
  time: Date,
  period: String,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
});

TimeSeriesBar.index(
  {
    symbol: 1,
    time: 1,
    period: 1,
  },
  {
    unique: true,
  },
);

export type DbTimeSeriesDataAvailability = {
  _id?: MongoObjectId;
  symbol: string;
  period: TimeSeriesPeriod;
  dataAvailableTo: Date;
};

const TimeSeriesDataAvailability = new Schema<DbTimeSeriesDataAvailability>({
  symbol: String,
  period: String,
  dataAvailableTo: Date,
});

export async function registerMongooseModels() {
  await model('Backtest', Backtest, 'backtests');
  await model('TimeSeriesBar', TimeSeriesBar, 'timeseries_bars');
  await model(
    'TimeSeriesDataAvailability',
    TimeSeriesDataAvailability,
    'timeseries_data_availability',
  );
}
