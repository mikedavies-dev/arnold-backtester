import {setHours, setMinutes, getUnixTime} from 'date-fns/fp';
import {flow} from 'fp-ts/lib/function';

const createMarketOpen = flow(setHours(9), setMinutes(30), getUnixTime);
const createMarketClose = flow(setHours(16), setMinutes(30), getUnixTime);
const createPreMarketOpen = flow(setHours(4), setMinutes(0), getUnixTime);

export type MarketStatus = 'CLOSED' | 'PREMARKET' | 'OPEN';

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
  parMarketOpen: number,
  marketOpen: number,
  marketClose: number,
): MarketStatus {
  if (time >= marketOpen && time <= marketClose) {
    return 'OPEN';
  }

  if (time >= parMarketOpen && time < marketOpen) {
    return 'PREMARKET';
  }

  return 'CLOSED';
}
