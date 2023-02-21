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

export const TickTypes = [
  'TRADE',
  'BID',
  'ASK',
  'VOLUME_DELTA',
  'HIGH',
  'LOW',
  'LAST',
  'CLOSE',
] as const;

export type TickType = typeof TickTypes[number];

export function isTickType(maybeTickType: unknown): maybeTickType is TickType {
  return (
    typeof maybeTickType === 'string' &&
    TickTypes.includes(maybeTickType as any)
  );
}

export type Tick = {
  time: number;
  type: TickType;
  size: number;
  value: number;
};

export type StoredTick = Tick & {
  index: number;
  dateTime: Date;
  symbol: string;
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
  m60: Array<Bar>;
  daily: Array<Bar>;
};

export type BarPeriod = keyof Bars;

export type TimeSeriesPeriod = 'm1' | 'm5' | 'm60' | 'daily';
export const TimeSeriesPeriods: TimeSeriesPeriod[] = [
  'm1',
  'm5',
  'm60',
  'daily',
];

export type Instrument = {
  externalId: string;
  symbol: string;
  name: string;
  data?: any;
};

export enum TickFileType {
  Merged = 'merged',
  Trades = 'trades',
  BidAsk = 'bidask',
}

export type WriteTickDataFn = (
  type: TickFileType,
  ticks: StoredTick[],
) => Promise<void>;

export type DownloadTickDataArgs = {
  instrument: Instrument;
  date: Date;
  write: WriteTickDataFn;
  merge: () => Promise<void>;
};

export type SubscribeMinuteUpdateArgs = {
  instrument: Instrument;
  onUpdate: (latestBar: Bar) => void;
};

export type SubscribePriceUpdateArgs = {
  instrument: Instrument;
  onUpdate: ({price, volume}: {price: number; volume: number}) => void;
};

/*
const MarketUpdateTickTypes = [
  'BID',
  'BID_SIZE',
  'ASK',
  'ASK_SIZE',
  'VOLUME',
  'LAST',
  'LAST_SIZE',
] as const;

export type MarketUpdateTickType = typeof MarketUpdateTickTypes[number];

// Make sure that the market tick type is a type we want
// https://stackoverflow.com/questions/36836011/checking-validity-of-string-literal-union-type-at-runtime

export function isMarketUpdateTickType(
  maybeMarketUpdateTickType: unknown,
): maybeMarketUpdateTickType is MarketUpdateTickType {
  return (
    typeof maybeMarketUpdateTickType === 'string' &&
    MarketUpdateTickTypes.includes(maybeMarketUpdateTickType as any)
  );
}
*/

export type SubscribeMarketUpdateArgs = {
  instrument: Instrument;
  onUpdate: ({type, value}: {type: TickType; value: number}) => void;
};

export type PlaceOrderArgs = {
  profileId: string;
  instrument: Instrument;
  order: OrderSpecification;
};

export type DataProvider = {
  name: string;
  init(args?: {workerIndex: number}): Promise<void>;
  shutdown(): Promise<void>;
  getTimeSeries(
    instrument: Instrument,
    end: Date,
    days: number,
    period: TimeSeriesPeriod,
  ): Promise<Bar[]>;
  downloadTickData(args: DownloadTickDataArgs): Promise<void>;
  instrumentLookup(searchTerm: string): Promise<Instrument[]>;
  subscribeMarketUpdates(args: SubscribeMarketUpdateArgs): number;
  cancelMarketUpdates: (requestId: number) => void;
  select: (instrument: Instrument) => void;
};

export type BrokerProvider = {
  name: string;
  init(args?: {workerIndex: number}): Promise<void>;
  shutdown(): Promise<void>;

  // Place an order for a profile
  placeOrder: (args: PlaceOrderArgs) => number;

  // See if a symbol/profile combo has any open orders
  hasOpenOrders: (profileId: string, instrument: Instrument) => boolean;

  // see if a symbol/profile combo has an open position
  hasOpenPosition: (profileId: string, instrument: Instrument) => boolean;

  // Get the current position size for an symbol/profile combo
  getPositionSize: (profileId: string, instrument: Instrument) => number;

  // get the currently open position (if any)
  getOpenPosition: (
    profileId: string,
    instrument: Instrument,
  ) => Position | null;

  // Close an open position with a reason
  closePosition: (
    profileId: string,
    instrument: Instrument,
    reason: string | null,
  ) => void;
};

export type ProfilePositions = Record<string, Array<Position>>;

export type PositionProvider = {
  init: () => Promise<void>;
  shutdown: () => Promise<void>;
  writeDbUpdates: () => Promise<void>;
  hasOpenOrders: (profileId: string, instrument: Instrument) => boolean;
  getOpenOrders: (profileId: string, instrument: Instrument) => Array<Order>;
  hasOpenPosition: (profileId: string, instrument: Instrument) => boolean;
  createOrder: (
    profileId: string,
    instrument: Instrument,
    order: Order,
  ) => void;
  updateOrderExecution: (
    orderId: number,
    execId: string,
    execution: Partial<OrderExecution>,
  ) => void;
  getOrderIdFromExecId: (execId: string) => number | null;
  getPositionSize: (profileId: string, instrument: Instrument) => number;
  setPositionClosing: (
    profileId: string,
    instrument: Instrument,
    reason: string | null,
  ) => void;
  isClosing: (profileId: string, instrument: Instrument) => boolean;
  getOpenPosition: (
    profileId: string,
    instrument: Instrument,
  ) => LivePosition | null;
  updateOrder: (orderId: number, updates: Partial<Order>) => void;
  getOrders: (profileId: string) => Array<Order>;
  getPositions: (profileId: string) => Array<Position>;
  getAllPositions: () => Array<LivePosition>;
  getAllOpenPositions: () => Array<LivePosition>;
};

export type Tracker = {
  open: number;
  high: number;
  low: number;
  last: number;
  volume: number;
  prevClose: number;
  bid: number;
  ask: number;
  preMarketHigh: number;
  preMarketLow: number;
  preMarketVolume: number;
  bars: Bars;
};

export type OrderAction = 'BUY' | 'SELL';
export type OrderType = 'MKT' | 'LMT' | 'STP' | 'TRAIL';
export type OrderState =
  | 'ACCEPTED'
  | 'PENDING'
  | 'FILLED'
  | 'CANCELLED'
  | 'INACTIVE'
  | 'UNKNOWN';

export type BaseOrder = {
  type: OrderType;
  parentId?: number;
  action: OrderAction;
  shares: number;
  transmit?: boolean;
};

// Order specification using TypeScript magic..
export type OrderSpecification =
  | (BaseOrder & {type: 'MKT'})
  | (BaseOrder & {type: 'STP'; price: number})
  | (BaseOrder & {type: 'LMT'; price: number})
  | (BaseOrder & {type: 'TRAIL'; price: number; triggerPrice?: number});

export type OrderExecution = {
  shares: number;
  commission: number;
  price: number;
  realizedPnL?: number;
  data?: any;
};

export type OrderExecutions = Record<string, OrderExecution>;

// Define the full order
export type Order = OrderSpecification & {
  id: number;
  symbol: string;
  openedAt: Date;
  state: OrderState;
  filledAt?: Date;
  remaining: number;
  avgFillPrice?: number;
  executions: OrderExecutions;
  data?: any;
};

export type Position = {
  symbol: string;
  orders: Array<Order>;
  size: number;
  data: any;
  openedAt: Date;
  closedAt: Date | null;
  closeReason: string | null;
  // Used to record when the position has been closed by closePosition
  // so that we don't create multiple close orders
  isClosing: boolean;
};

export type LivePosition = Position & {
  externalId: string;
  profileId: string;
};

export type PositionDirection = 'LONG' | 'SHORT';

export type BrokerState = {
  getMarketTime: () => Date;
  nextOrderId: number;
  orders: Array<Order>;
  openOrders: Record<number, Order>;
  positions: Array<Position>;
  openPositions: Record<string, Position>;
  balance: number;
};

export type StrategyDefinition = {
  name: string;
  source: string | null;
};

// Parsed format
export type Profile = {
  strategy: StrategyDefinition;
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

export type LogMessage = {
  at: number;
  msg: string;
};

export type DbBacktest = {
  _id?: MongoObjectId;
  createdAt: Date;
  positions: Array<Position>;
  profile: Profile;
  logs: Array<LogMessage>;
};

export type DbTimeSeriesBar = {
  _id?: MongoObjectId;
  symbol: string;
  period: TimeSeriesPeriod;
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type DbTimeSeriesDataAvailability = {
  _id?: MongoObjectId;
  symbol: string;
  period: TimeSeriesPeriod;
  dateRequested: Date;
};

export type DbInstrument = {
  _id?: MongoObjectId;
  externalId: string;
  provider: string;
  symbol: string;
  name: string;
  data?: any;
};

export type DbLivePosition = {
  _id?: MongoObjectId;
  externalId: string;
  symbol: string;
  profileId: string;
  data: any;
  openedAt: Date;
  closedAt: Date | null;
  closeReason: string | null;
  // Used to record when the position has been closed by closePosition
  // so that we don't create multiple close orders
  isClosing: boolean;
  orders: Array<Order>;
};

export type MarketStatus = 'CLOSED' | 'PREMARKET' | 'OPEN';

export type Market = {
  status: MarketStatus;
  current: Times;
  preMarketOpen: Times;
  open: Times;
  close: Times;
};

export type StrategyParameters = {
  symbol: string;
  log: LoggerCallback;
  tracker: Tracker;
  trackers: Record<string, Tracker>;
  market: Market;
  broker: {
    placeOrder: (spec: OrderSpecification) => number;
    hasOpenOrders: () => boolean;
    getPositionSize: () => number;
    hasOpenPosition: () => boolean;
    getOpenPosition: () => Position | null;
    closePosition: (reason: string) => void;
    orders: Array<Order>;
    positions: Array<Position>;
  };
};

export type IndicatorUpdater = {
  update: () => void;
};

export type Indicator = {
  updateLatest: () => void;
  recalculate: () => void;
  dependencies: Array<Array<Bar>>;
};

export type LineIndicator = Indicator & {
  values: number[];
};

export type LineIndicatorAccessor = LineIndicator & {
  last: number;
  values: () => number[];
};

export type IsSetupParameters = {
  // extra params
};

export type HandleTickParameters = {
  // extra params
};

export type Strategy = {
  isSetup: (params: IsSetupParameters) => boolean;
  handleTick: (tick: Tick) => void;
  indicators: Indicator[];
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

export type TimeSeriesRequestBlock = {
  end: Date;
  days: number;
};

/*
Filter out the null entries and tell the compiler that value is of that type.

Useful for things like:

  const array: (string | null)[] = ['foo', 'bar', null, 'zoo', null];
  const filteredArray: string[] = array.filter(notEmpty);
*/

export function notEmpty<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return value !== null && value !== undefined;
}

export const MaximumBarCount = 250;

export const Periods = {
  m1: 1,
  m5: 5,
  m60: 60,
  daily: 1440,
};

export const TimeSeriesPeriodToPeriod: Record<TimeSeriesPeriod, number> = {
  daily: Periods.daily,
  m1: Periods.m1,
  m5: Periods.m5,
  m60: Periods.m60,
};

export type LiveTradingProfile = {
  id: string;
  name: string;
  strategy: StrategyDefinition;
  accountSize: number;
  symbols: string[];
  enabled: boolean;
};

export type LiveTradingConfig = {
  profiles: LiveTradingProfile[];
};

export type Times = {
  unix: number;
  dt: Date;
  time: string;
};

export type TraderStatusUpdate = {
  market: Market;
  positions: Array<LivePosition>;
  instruments: Array<{
    symbol: string;
    tracker: Tracker;
    profiles: Array<{
      id: string;
      name: string;
      currentlyInSetup: boolean;
    }>;
  }>;
};
