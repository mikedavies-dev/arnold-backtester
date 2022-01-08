import {fromUnixTime, parse, getUnixTime, endOfToday} from 'date-fns';
import {Tick, TickType} from '../../utils/data';
import {flow} from 'fp-ts/lib/function';

export function createTick({
  type,
  time,
  value,
  size,
}: {
  type: TickType;
  time: number;
  value: number;
  size: number;
}): Tick {
  return {
    type,
    time,
    value,
    size,
    dateTime: fromUnixTime(time),
    symbol: 'AAAA',
    index: 0,
  };
}

export function createTime(time: string) {
  return flow(parse, getUnixTime)(time, 'HH:mm', endOfToday());
}
