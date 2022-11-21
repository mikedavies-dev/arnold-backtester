import {Schema, model} from 'mongoose';
import {
  DbBacktest,
  DbTimeSeriesBar,
  DbTimeSeriesDataAvailability,
  DbInstrument,
  DbLivePosition,
} from '../core';

const Order = {
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
  executions: {
    type: Map,
    of: {
      execution: {},
      commission: Number,
      realizedPnL: Number,
      data: {},
    },
  },
};

const Backtest = new Schema<DbBacktest>({
  createdAt: Date,
  positions: [
    {
      symbol: String,
      orders: [Order],
      size: Number,
      data: {},
      closeReason: String,
      isClosing: Boolean,
      openedAt: Date,
      closedAt: Date,
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

const LivePosition = new Schema<DbLivePosition>({
  symbol: String,
  profileId: String,
  data: {},
  openedAt: Date,
  closedAt: Date,
  closeReason: String,
  isClosing: {
    type: Boolean,
    default: false,
  },
  orders: [Order],
});

LivePosition.index({
  profileId: 1,
  externalId: 1,
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
  await model('LivePosition', LivePosition, 'live_positions');
}
