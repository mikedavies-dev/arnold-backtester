import {setHours, setMinutes, getUnixTime} from 'date-fns/fp';
import {flow} from 'fp-ts/lib/function';
import {getTimes} from './dates';

const createMarketOpen = flow(setHours(9), setMinutes(30), getUnixTime);
const createMarketClose = flow(setHours(16), setMinutes(0), getUnixTime);
const createPreMarketOpen = flow(setHours(4), setMinutes(0), getUnixTime);

import {Market, MarketStatus} from '../core';

export function getMarketOpen(date: Date) {
  return createMarketOpen(date);
}

export function getMarketClose(date: Date) {
  return createMarketClose(date);
}

export function getPreMarketOpen(date: Date) {
  return createPreMarketOpen(date);
}

export function getMarketState(
  time: number,
  preMarketOpen: number,
  marketOpen: number,
  marketClose: number,
): MarketStatus {
  if (time >= marketOpen && time <= marketClose) {
    return 'OPEN';
  }

  if (time >= preMarketOpen && time < marketOpen) {
    return 'PREMARKET';
  }

  return 'CLOSED';
}

export function initMarket(
  date: Date,
  preMarketOpen: number,
  marketOpen: number,
  marketClose: number,
) {
  const result: Market = {
    status: getMarketState(
      getUnixTime(date),
      preMarketOpen,
      marketOpen,
      marketClose,
    ),
    current: getTimes(getUnixTime(date)),
    open: getTimes(marketOpen),
    close: getTimes(marketClose),
    preMarketOpen: getTimes(preMarketOpen),
  };
  return result;
}

export function updateMarket(market: Market, date: Date) {
  market.current = getTimes(getUnixTime(date));

  market.status = getMarketState(
    getUnixTime(date),
    market.preMarketOpen.unix,
    market.open.unix,
    market.close.unix,
  );
}
