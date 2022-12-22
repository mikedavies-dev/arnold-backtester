import {
  formatDateTime,
  formatDate,
  createTimeAsUnix,
  createTimeAsDate,
  getTimes,
} from '../../utils/dates';

import {getTestDate} from '../test-utils/tick';

test('formatting a date', () => {
  expect(formatDate(getTestDate())).toMatch(`2022-01-01`);
});

test('formatting a date and time', () => {
  expect(formatDateTime(getTestDate())).toMatch(`2022-01-01 00:00:00`);
});

test('create a unix time from a string', () => {
  expect(createTimeAsUnix('10:12', getTestDate())).toBe(1641049920);
});

test('create a date from a string', () => {
  expect(createTimeAsDate('10:12').getTime()).toBe(1641049920000);
});

test('get times in various formats', () => {
  const source = createTimeAsUnix('10:12', getTestDate());
  const times = getTimes(source);

  expect(times.time).toBe('10:12:00');
  expect(times.unix).toBe(source);
  expect(times.date).toMatchInlineSnapshot(`2022-01-01T15:12:00.000Z`);
});
