import {setHours, setMinutes, getUnixTime} from 'date-fns/fp';
import {flow} from 'fp-ts/lib/function';

const createMarketOpen = flow(setHours(9), setMinutes(30), getUnixTime);
const createMarketClose = flow(setHours(16), setMinutes(30), getUnixTime);

export function getMarketOpen(date: Date) {
  return createMarketOpen(date);
}

export function getMarketClose(date: Date) {
  return createMarketClose(date);
}
