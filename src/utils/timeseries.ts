import {startOfDay, isBefore, addDays, min, differenceInDays} from 'date-fns';

import {TimeSeriesPeriod, TimeSeriesRequestBlock} from '../core';

const barRequestBatchSize: Record<TimeSeriesPeriod, number> = {
  m1: 1,
  m5: 5,
  m60: 60,
  daily: 100,
};

export function splitDatesIntoBlocks(
  from: Date,
  to: Date,
  barSize: TimeSeriesPeriod,
) {
  const blocks: TimeSeriesRequestBlock[] = [];

  const dayIncrement = barRequestBatchSize[barSize];

  for (
    let date = startOfDay(from);
    isBefore(date, startOfDay(to));
    date = addDays(date, dayIncrement + 1)
  ) {
    const blockTo = min([addDays(date, dayIncrement), to]);

    blocks.push({
      end: blockTo,
      days: differenceInDays(blockTo, date),
    });
  }

  return blocks;
}
