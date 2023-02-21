import {addMinutes} from 'date-fns';

import {OrderAction, Position, Order} from '../../core';
import {createTimeAsDate} from './tick';

type TestOrderSpec = {
  action: OrderAction;
  winner: boolean;
  length: number;
  shares: number;
  profitLossPerShares: number;
  commissionPerOrder?: number;
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
  commissionPerOrder = 1,
}: TestOrderSpec): Position {
  const openedAt = createTimeAsDate(time, date);

  const entry: Order = {
    id: 1,
    symbol,
    action,
    shares,
    remaining: shares,
    type: 'MKT',
    openedAt: openedAt,
    filledAt: openedAt,
    avgFillPrice: entryPrice,
    state: 'FILLED',
    executions: {
      exec1: {
        commission: commissionPerOrder,
        shares,
        price: entryPrice,
      },
    },
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
    remaining: shares,
    type: 'MKT',
    openedAt: closedAt,
    filledAt: closedAt,
    avgFillPrice: exitPrice,
    state: 'FILLED',
    executions: {
      exec1: {
        commission: commissionPerOrder,
        shares,
        price: exitPrice,
        realizedPnL: profitLossPerShares * shares * (winner ? 1 : -1),
      },
    },
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
