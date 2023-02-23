import {format as formatFP} from 'date-fns/fp';
import {
  parse,
  getUnixTime,
  fromUnixTime,
  format,
  isValid,
  add,
  differenceInDays,
  startOfDay,
} from 'date-fns';
import {flow} from 'fp-ts/lib/function';
import {Times} from '../core';

export const formatDate = formatFP('yyyy-MM-dd');
export const formatDateTime = formatFP('yyyy-MM-dd HH:mm:ss');
export const formatTime = formatFP('HH:mm:ss');

export function createTimeAsUnix(time: string, base: Date) {
  return flow(parse, getUnixTime)(time, 'HH:mm', base);
}

export function createTimeAsDate(
  time: string,
  date = '2022-01-01',
  base: Date = new Date(),
) {
  return flow(parse)(time, 'HH:mm', parse(date, 'yyyy-MM-dd', base));
}

export function getTimes(unixTime: number): Times {
  const date = fromUnixTime(unixTime);
  return {
    unix: unixTime,
    dt: date,
    time: format(date, 'HH:mm:ss'),
  };
}

export function parseDate(input: string) {
  const ret = parse(input, 'yyyy-MM-dd', new Date());
  return isValid(ret) ? ret : null;
}

export function parseDateTime(input: string) {
  const ret = parse(input, 'yyyy-MM-dd HH:mm', new Date());
  return isValid(ret) ? ret : null;
}

export function dateArray(from: Date, to: Date) {
  const days = differenceInDays(to, from);
  const start = startOfDay(from);

  const dates = Array(days + 1)
    .fill(null)
    .map((_, index) =>
      add(start, {
        days: index,
      }),
    );

  return dates;
}
