import {addMinutes} from 'date-fns';

import {OrderAction, Position, Order} from '../../core';
import {createTimeAsDate} from './tick';

type TestOrderSpec = {
  action: OrderAction;
  winner: boolean;
  length: number;
  shares: number;
  profitLossPerShares: number;
  entryPrice: number;
  symbol?: string;
  time: string;
  date?: string;
};

export function createTestPosition({
  symbol = 'ZZZZ',
  shares,
  action,
  winner,
  length,
  profitLossPerShares,
  entryPrice,
  time,
  date,
}: TestOrderSpec): Position {
  const openedAt = createTimeAsDate(time, date);

  const entry: Order = {
    id: 1,
    symbol,
    action,
    shares,
    type: 'MKT',
    openedAt: openedAt,
    filledAt: openedAt,
    avgFillPrice: entryPrice,
    state: 'FILLED',
    executions: [],
  };

  const closedAt = addMinutes(openedAt, length);

  const exitPrice = (() => {
    if (action === 'BUY') {
      return winner
        ? entryPrice + profitLossPerShares
        : entryPrice - profitLossPerShares;
    }

    return winner
      ? entryPrice - profitLossPerShares
      : entryPrice + profitLossPerShares;
  })();

  const exit: Order = {
    id: 1,
    symbol,
    action: action === 'BUY' ? 'SELL' : 'BUY',
    shares,
    type: 'MKT',
    openedAt: closedAt,
    filledAt: closedAt,
    avgFillPrice: exitPrice,
    state: 'FILLED',
    executions: [],
  };

  return {
    symbol,
    orders: [entry, exit],
    size: shares,
    data: null,
    closeReason: 'testing',
    isClosing: false,
    openedAt,
    closedAt,
  };
}
