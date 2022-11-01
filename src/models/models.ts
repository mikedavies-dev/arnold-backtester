import {Schema, model} from 'mongoose';
import {
  DbBacktest,
  DbTimeSeriesBar,
  DbTimeSeriesDataAvailability,
  DbInstrument,
  DbPosition,
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
    extraSymbols: [String],
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
  dateRequested: Date,
});

const Instrument = new Schema<DbInstrument>({
  externalId: String,
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

const Position = new Schema<DbPosition>({
  profileId: String,
  _instrument: {
    type: Schema.Types.ObjectId,
    ref: 'Instrument',
  },
  orders: [
    {
      orderId: String,
      specification: {
        type: {
          type: String,
        },
        parentId: {
          type: Number,
          default: null,
        },
        action: String,
        shares: Number,
      },
      status: String,
      filled: Number,
      avgOrderPrice: Number,
      createdAt: Number,
      filledAt: Date,
      executions: [
        {
          execId: String,
          execution: {},
          commission: Number,
          realizedPnL: Number,
          data: {},
        },
      ],
      data: {},
    },
  ],
});

Position.index({
  profileId: 1,
  instrument: 1,
  'orders.orderId': 1,
});

export async function registerMongooseModels() {
  await model('Backtest', Backtest, 'backtests');
  await model('TimeSeriesBar', TimeSeriesBar, 'timeseries_bars');
  await model(
    'TimeSeriesDataAvailability',
    TimeSeriesDataAvailability,
    'timeseries_data_availability',
  );
  await model('Instrument', Instrument, 'instruments');
  await model('Position', Position, 'positions');
}
