import {parse, fromUnixTime, format} from 'date-fns';
import {flow} from 'fp-ts/lib/function';

import {getMarketOpen, getMarketClose} from '../../../utils/market';

test('get market open', () => {
  const marketTime = flow(parse, getMarketOpen, fromUnixTime, date =>
    format(date, 'yyyy-MM-dd HH:mm:ss'),
  );

  const open = marketTime(
    '2021-01-01 12:34:00',
    'yyyy-MM-dd HH:mm:ss',
    new Date(),
  );

  expect(open).toBe('2021-01-01 09:30:00');
});

test('get market close', () => {
  const marketTime = flow(parse, getMarketClose, fromUnixTime, date =>
    format(date, 'yyyy-MM-dd HH:mm:ss'),
  );

  const close = marketTime(
    '2021-01-01 12:34:00',
    'yyyy-MM-dd HH:mm:ss',
    new Date(),
  );

  expect(close).toBe('2021-01-01 16:30:00');
});
