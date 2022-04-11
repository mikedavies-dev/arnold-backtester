import {Schema, model} from 'mongoose';
import {
  DbBacktest,
  DbTimeSeriesBar,
  DbTimeSeriesDataAvailability,
  DbInstrument,
} from '../core';

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

const TimeSeriesDataAvailability = new Schema<DbTimeSeriesDataAvailability>({
  symbol: String,
  period: String,
  dataAvailableTo: Date,
});

const Instrument = new Schema<DbInstrument>({
  provider: String,
  symbol: String,
  name: String,
  data: {},
});

Instrument.index(
  {
    provider: 1,
    symbol: 1,
  },
  {
    unique: true,
  },
);

export async function registerMongooseModels() {
  await model('Backtest', Backtest, 'backtests');
  await model('TimeSeriesBar', TimeSeriesBar, 'timeseries_bars');
  await model(
    'TimeSeriesDataAvailability',
    TimeSeriesDataAvailability,
    'timeseries_data_availability',
  );
  await model('Instrument', Instrument, 'instruments');
}
