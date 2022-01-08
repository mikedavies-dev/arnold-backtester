import {parse, getUnixTime} from 'date-fns';

import {getBarTime, Periods} from '../../utils/tracker';

const parseDate = (date: string) =>
  getUnixTime(parse(date, 'yyyy-MM-dd HH:mm:ss', new Date()));

test('bar time', () => {
  const time = getBarTime(Periods.m1, parseDate('2021-01-01 09:30:00'));
  expect(time).toBe('2021-01-01 09:30:00');
});
