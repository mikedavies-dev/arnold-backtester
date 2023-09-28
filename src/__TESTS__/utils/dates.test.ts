import {
  formatDateTime,
  formatDate,
  createTimeAsUnix,
  createTimeAsDate,
  getTimes,
  parseDate,
  parseDateTime,
  barIndexFromTime,
} from '../../utils/dates';

import {getTestDate} from '../testing/tick';

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
  expect(times.dt).toMatchInlineSnapshot(`2022-01-01T15:12:00.000Z`);
});

test('parsing a date', () => {
  const dt = parseDate('2022-01-01');
  expect(dt).not.toBeNull();

  if (dt) {
    expect(formatDate(dt)).toEqual('2022-01-01');
  }
});

test('fail to parse an invalid date', () => {
  const dt = parseDate('INVALID');
  expect(dt).toBeNull();
});

test('parsing a date/time', () => {
  const dt = parseDateTime('2022-01-01 10:00');
  expect(dt).not.toBeNull();

  if (dt) {
    expect(formatDateTime(dt)).toEqual('2022-01-01 10:00:00');
  }
});

test('fail to parse an invalid date/time', () => {
  const dt = parseDateTime('INVALID');
  expect(dt).toBeNull();
});

test('calculate a bar index', () => {
  const dt1 = parseDateTime('2022-01-01 10:00');

  if (dt1) {
    expect(barIndexFromTime(dt1, 1)).toEqual(27350820);
    expect(barIndexFromTime(dt1, 5)).toEqual(5470164);
    expect(barIndexFromTime(dt1, 60)).toEqual(455847);
  }

  const dt2 = parseDateTime('2022-01-01 11:00');

  if (dt2) {
    expect(barIndexFromTime(dt2, 1)).toEqual(27350880);
    expect(barIndexFromTime(dt2, 5)).toEqual(5470176);
    expect(barIndexFromTime(dt2, 60)).toEqual(455848);
  }
});
