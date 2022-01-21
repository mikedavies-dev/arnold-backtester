import {parse, getUnixTime} from 'date-fns';

import {formatBarTime, Periods} from '../../../utils/tracker';

const parseDate = (date: string) =>
  getUnixTime(parse(date, 'yyyy-MM-dd HH:mm:ss', new Date()));

test('bar time 1m', () => {
  const time = formatBarTime(Periods.m1, parseDate('2021-01-01 09:33:00'));
  expect(time).toBe('2021-01-01 09:33');
});

test('bar time 5m', () => {
  const time = formatBarTime(Periods.m5, parseDate('2021-01-01 09:33:00'));
  expect(time).toBe('2021-01-01 09:30');
});

test('bar time daily', () => {
  const time = formatBarTime(Periods.daily, parseDate('2021-01-01 09:33:00'));
  expect(time).toBe('2021-01-01 00:00');
});
