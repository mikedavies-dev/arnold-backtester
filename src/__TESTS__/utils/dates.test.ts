import {formatDateTime, formatDate} from '../../utils/dates';
import {getTestDate} from '../test-utils/tick';

test('formatting a date', () => {
  expect(formatDate(getTestDate())).toMatch(`2022-01-01`);
});

test('formatting a date and time', () => {
  expect(formatDateTime(getTestDate())).toMatch(`2022-01-01 00:00:00`);
});
