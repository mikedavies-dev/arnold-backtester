export type LoggerCallback = (message: string, ...args: any) => void;

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

export type TimeSeriesPeriod = 'm1' | 'm5' | 'm60' | 'daily';
