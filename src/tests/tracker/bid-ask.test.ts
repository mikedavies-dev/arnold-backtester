import {startOfToday, fromUnixTime} from 'date-fns';

import {initTracker, updateTracker} from '../../utils/tracker';
import {getMarketOpen, getMarketClose} from '../../utils/market';
import {Tick, TickType} from '../../utils/data';

function createTick({
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

test('bid/ask', () => {
  const data = initTracker();

  const marketOpen = getMarketOpen(startOfToday());
  const marketClose = getMarketClose(startOfToday());

  expect(data.bid).toBe(0);
  expect(data.ask).toBe(0);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: marketOpen - 1,
      type: 'BID',
      value: 1,
      size: 100,
    }),
  });

  expect(data.bid).toBe(1);
  expect(data.ask).toBe(0);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: marketOpen,
      type: 'BID',
      value: 2,
      size: 100,
    }),
  });

  expect(data.bid).toBe(2);
  expect(data.ask).toBe(0);

  updateTracker({
    data,
    marketOpen,
    marketClose,
    tick: createTick({
      time: marketOpen,
      type: 'ASK',
      value: 1.8,
      size: 100,
    }),
  });

  expect(data.bid).toBe(2);
  expect(data.ask).toBe(1.8);
});
