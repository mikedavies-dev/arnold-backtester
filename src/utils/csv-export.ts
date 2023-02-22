import {stringify} from 'csv-stringify/sync';

import {DbLivePosition, Position} from '../core';
import {formatDateTime} from './dates';
import {
  isFilledOrder,
  positionAction,
  positionAvgFillPrice,
  positionCommission,
  positionEntryPrice,
  positionRealisedPnL,
  positionSize,
} from './derived';

export function positionsHeaders() {
  return stringify([
    [
      'symbol',
      'action',
      'size',
      'openedAt',
      'closedAt',
      'commission',
      'pnl',
      'entryPrice',
      'avgEntryPrice',
      'totalOrders',
      'filledOrders',
      'closeReason',
    ],
  ]);
}

export function positionsCsv(positions: Array<Position | DbLivePosition>) {
  const data = positions
    .filter(p => p.closedAt)
    .map(position => {
      if (!position.closedAt) {
        return null;
      }

      return [
        position.symbol,
        positionAction(position),
        positionSize(position).toFixed(2),
        formatDateTime(position.openedAt),
        formatDateTime(position.closedAt),
        positionCommission(position).toFixed(2),
        positionRealisedPnL(position).toFixed(2),
        positionEntryPrice(position)?.toFixed(2) || null,
        positionAvgFillPrice(position).toFixed(2),
        position.orders.length,
        position.orders.filter(isFilledOrder).length,
        position.closeReason,
      ];
    })
    .filter(Boolean);

  return stringify(data);
}
