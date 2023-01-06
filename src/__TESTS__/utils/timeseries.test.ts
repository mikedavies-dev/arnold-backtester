import {addWeeks} from 'date-fns';

import {splitDatesIntoBlocks} from '../../utils/timeseries';
import {getTestDate} from '../testing/tick';

test('splitting dates into block sizes', () => {
  // The same dates should not return anything
  const testSameDates = splitDatesIntoBlocks(
    getTestDate(),
    getTestDate(),
    'daily',
  );
  expect(testSameDates).toStrictEqual([]);

  // One week of daily data
  const testOneWeekOfDaily = splitDatesIntoBlocks(
    getTestDate(),
    addWeeks(getTestDate(), 1),
    'daily',
  );

  expect(testOneWeekOfDaily.length).toBe(1);
  expect(testOneWeekOfDaily[0].days).toBe(7);

  // One week of daily data
  const testMinuteDate = splitDatesIntoBlocks(
    getTestDate(),
    addWeeks(getTestDate(), 1),
    'm1',
  );

  expect(testMinuteDate).toMatchInlineSnapshot(`
    Array [
      Object {
        "days": 1,
        "end": 2022-01-02T05:00:00.000Z,
      },
      Object {
        "days": 1,
        "end": 2022-01-03T05:00:00.000Z,
      },
      Object {
        "days": 1,
        "end": 2022-01-04T05:00:00.000Z,
      },
      Object {
        "days": 1,
        "end": 2022-01-05T05:00:00.000Z,
      },
      Object {
        "days": 1,
        "end": 2022-01-06T05:00:00.000Z,
      },
      Object {
        "days": 1,
        "end": 2022-01-07T05:00:00.000Z,
      },
      Object {
        "days": 1,
        "end": 2022-01-08T05:00:00.000Z,
      },
    ]
  `);
});
