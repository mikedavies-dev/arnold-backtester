export type LoggerCallback = (message: string, ...args: any) => void;

export type RawTick = {
  time: number;
  index: number;
  dateTime: string;
  symbol: string;
  type: TickType;
  size: number;
  value: number;
};

export type TickType = 'TRADE' | 'BID' | 'ASK';

export type Tick = {
  time: number;
  index: number;
  dateTime: Date;
  symbol: string;
  type: TickType;
  size: number;
  value: number;
};

export type Bar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Bars = {
  m1: Array<Bar>;
  m5: Array<Bar>;
  daily: Array<Bar>;
};

export type BarPeriod = keyof Bars;

export type TimeSeriesPeriod = 'm1' | 'm5' | 'm60' | 'daily';

export type Instrument = {
  symbol: string;
  name: string;
  data?: any;
};

export type DataProvider = {
  name: string;
  init(): Promise<void>;
  getTimeSeries(
    symbol: string,
    from: Date,
    to: Date,
    period: TimeSeriesPeriod,
  ): Promise<Array<Bar>>;
  instrumentLookup(searchTerm: string): Promise<Instrument[]>;
};

export type Tracker = {
  open: number;
  high: number;
  low: number;
  last: number;
  volume: number;
  bid: number;
  ask: number;
  preMarketHigh: number;
  preMarketLow: number;
  preMarketVolume: number;
  bars: Bars;
};

export type OrderAction = 'BUY' | 'SELL';
export type OrderType = 'MKT' | 'LMT' | 'STP' | 'TRAIL';
export type OrderState = 'ACCEPTED' | 'PENDING' | 'FILLED' | 'CANCELLED';

export type BaseOrder = {
  type: OrderType;
  parentId?: number;
  symbol: string;
  action: OrderAction;
  shares: number;
};

// Order specification using TypeScript magic..
export type OrderSpecification =
  | (BaseOrder & {type: 'MKT'})
  | (BaseOrder & {type: 'STP'; price: number})
  | (BaseOrder & {type: 'LMT'; price: number})
  | (BaseOrder & {type: 'TRAIL'; price: number; triggerPrice?: number});

// Define the full order
export type Order = OrderSpecification & {
  id: number;
  openedAt: Date;
  state: OrderState;
  filledAt?: Date;
  avgFillPrice?: number;
};

export type Position = {
  symbol: string;
  orders: Array<Order>;
  size: number;
  data: any;
  closeReason: string | null;
  isClosing: boolean;
};

export type PositionDirection = 'LONG' | 'SHORT' | 'UNKNOWN';

export type BrokerState = {
  getMarketTime: () => Date;
  nextOrderId: number;
  orders: Array<Order>;
  openOrders: Record<number, Order>;
  positions: Array<Position>;
  openPositions: Record<string, Position>;
  orderExecutionDelayMs: number;
  balance: number;
  commissionPerOrder: number;
};

// Parsed format
export type Profile = {
  strategy: {
    name: string;
    source: string | null;
  };
  dates: {
    from: Date;
    to: Date;
    dates: Array<Date>;
  };
  symbols: Array<string>;
  threads: number;
  initialBalance: number;
  commissionPerOrder: number;
};

// Models

export type MongoObjectId = {
  toString(): string;
};

export type DbBacktest = {
  _id?: MongoObjectId;
  createdAt: Date;
  positions: Array<Position>;
  profile: Profile;
};

export type DbTimeSeriesBar = {
  _id?: MongoObjectId;
  symbol: string;
  period: TimeSeriesPeriod;
} & Bar;

export type DbTimeSeriesDataAvailability = {
  _id?: MongoObjectId;
  symbol: string;
  period: TimeSeriesPeriod;
  dataAvailableTo: Date;
};

export type DbInstrument = {
  _id?: MongoObjectId;
  provider: string;
  symbol: string;
  name: string;
  data?: any;
};

export type MarketStatus = 'CLOSED' | 'PREMARKET' | 'OPEN';

export type HandleTickParameters = {
  log: LoggerCallback;
  tick: Tick;
  symbol: string;
  tracker: Tracker;
  trackers: Record<string, Tracker>;
  marketState: MarketStatus;
  broker: {
    state: BrokerState;
    placeOrder: (spec: OrderSpecification) => number;
    hasOpenOrders: (symbol: string) => boolean;
    getPositionSize: (symbol: string) => number;
  };
};

export type MetricsByPeriod = {
  positions: number;
  orders: number;
  commission: number;
  grossProfit: number;
  grossLoss: number;
  longPositions: number;
  longWinners: number;
  shortPositions: number;
  shortWinners: number;
  longWinnerPercent: number;
  shortWinnerPercent: number;
  profitFactor: number;
  grossProfitAndLoss: number;
  netProfitAndLoss: number;
};
