import {parse, fromUnixTime, format, addHours} from 'date-fns';
import {flow} from 'fp-ts/lib/function';

import {
  getMarketOpen,
  getMarketClose,
  initMarket,
  getPreMarketOpen,
  updateMarket,
} from '../../utils/market';

import {getTestDate} from '../testing/tick';

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

  expect(close).toBe('2021-01-01 16:00:00');
});

test('init market time', () => {
  const marketOpen = getMarketOpen(getTestDate());
  const preMarketOpen = getPreMarketOpen(getTestDate());
  const marketClose = getMarketClose(getTestDate());

  const market = initMarket(
    getTestDate(),
    preMarketOpen,
    marketOpen,
    marketClose,
  );

  expect(market.close.unix).toBe(marketClose);
  expect(market.open.unix).toBe(marketOpen);

  expect(market.status).toBe('CLOSED');

  expect(market.open).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T14:30:00.000Z,
      "time": "09:30:00",
      "unix": 1641047400,
    }
  `);
  expect(market.close).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T21:00:00.000Z,
      "time": "16:00:00",
      "unix": 1641070800,
    }
  `);
  expect(market.current).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T05:00:00.000Z,
      "time": "00:00:00",
      "unix": 1641013200,
    }
  `);

  updateMarket(market, addHours(market.current.dt, 10));

  expect(market.status).toBe('OPEN');

  expect(market.open).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T14:30:00.000Z,
      "time": "09:30:00",
      "unix": 1641047400,
    }
  `);
  expect(market.close).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T21:00:00.000Z,
      "time": "16:00:00",
      "unix": 1641070800,
    }
  `);
  expect(market.current).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T15:00:00.000Z,
      "time": "10:00:00",
      "unix": 1641049200,
    }
  `);

  updateMarket(market, addHours(market.current.dt, 10));

  expect(market.status).toBe('CLOSED');

  expect(market.open).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T14:30:00.000Z,
      "time": "09:30:00",
      "unix": 1641047400,
    }
  `);
  expect(market.close).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-01T21:00:00.000Z,
      "time": "16:00:00",
      "unix": 1641070800,
    }
  `);
  expect(market.current).toMatchInlineSnapshot(`
    Object {
      "dt": 2022-01-02T01:00:00.000Z,
      "time": "20:00:00",
      "unix": 1641085200,
    }
  `);
});
