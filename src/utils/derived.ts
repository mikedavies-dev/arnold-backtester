import {sum} from 'lodash/fp';
import {pipe} from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';

import {
  OrderState,
  LivePosition,
  Tracker,
  Position,
  notEmpty,
  OrderAction,
  Order,
  PositionDirection,
} from '../core';

type OrderExecutions = Record<
  string,
  {realizedPnL?: number; commission: number}
>;

export function isPendingOrder(order: {state: OrderState}) {
  return ['ACCEPTED', 'PENDING'].indexOf(order.state) !== -1;
}

export function isFilledOrder(order: {state: OrderState}) {
  return order.state === 'FILLED';
}

export function isPositionOpen(position: LivePosition) {
  return !position.closedAt;
}

export function isBuyOrder(order: {action: OrderAction}) {
  return order.action === 'BUY';
}

export function isSellOrder(order: {action: OrderAction}) {
  return order.action === 'SELL';
}

export function percentChange(tracker: {prevClose: number; last: number}) {
  const diff = tracker.last - tracker.prevClose;
  return tracker.prevClose ? diff / tracker.prevClose : 0;
}

export function orderRealizedPnL(order: {executions: OrderExecutions}): number {
  return pipe(
    order.executions,
    Object.values,
    A.map(e => e.realizedPnL),
    A.filter(notEmpty),
    sum,
  );
}

export function positionRealisedPnL(position: {
  orders: Array<{
    executions: OrderExecutions;
  }>;
}): number {
  return pipe(position.orders, A.map(orderRealizedPnL), sum);
}

export function positionPnL(position: Position, tracker: Tracker) {
  return positionOpenPnL(position, tracker) + positionRealisedPnL(position);
}

export function orderCommission(order: {executions: OrderExecutions}): number {
  return pipe(
    order.executions,
    Object.values,
    A.map(e => e.commission),
    A.filter(notEmpty),
    sum,
  );
}

export function positionCommission(position: {
  orders: Array<{
    executions: OrderExecutions;
  }>;
}): number {
  return pipe(position.orders, A.map(orderCommission), sum);
}

export function positionSize(position: {
  orders: Array<{action: OrderAction; state: OrderState; shares: number}>;
}): number {
  const orders = pipe(position.orders, A.filter(isFilledOrder));

  return Math.max(
    pipe(
      orders,
      A.filter(isBuyOrder),
      A.map(o => o.shares),
      sum,
    ),
    pipe(
      orders,
      A.filter(isSellOrder),
      A.map(o => o.shares),
      sum,
    ),
  );
}

export function positionAction(position: {
  orders: Array<{action: OrderAction}>;
}): OrderAction {
  return pipe(
    position.orders,
    A.head,
    O.map(o => o.action),
    O.getOrElse(() => 'BUY' as OrderAction),
  );
}

export function positionExitAction(position: {
  orders: Array<{action: OrderAction}>;
}): OrderAction {
  const entryAction = positionAction(position);
  return entryAction === 'BUY' ? 'SELL' : 'BUY';
}

export function positionDirection(position: Position): PositionDirection {
  return positionAction(position) === 'BUY' ? 'LONG' : 'SHORT';
}

export function positionFillPrice(position: Position) {
  const size = positionSize(position);
  const action = positionAction(position);

  const value = pipe(
    position.orders,
    A.filter(o => o.action === action && Boolean(o.avgFillPrice)),
    A.reduce(0, (acc, o) => {
      return acc + o.shares * (o.avgFillPrice as number);
    }),
  );

  return size > 0 ? value / size : 0;
}

export function positionOpenPnL(position: Position, tracker: Tracker) {
  const price = positionFillPrice(position);

  const {size} = position;

  const purchase = size * price;
  const market = size * tracker.last;

  return market - purchase;
}

export function currentPositionSize({orders}: {orders: Array<Order>}): number {
  return orders
    .filter(isFilledOrder)
    .reduce(
      (acc, order) =>
        acc + (order.action === 'BUY' ? order.shares : order.shares * -1),
      0,
    );
}

export function positionEntryPrice({
  orders,
}: {
  orders: Array<Order>;
}): number | null {
  return orders.find(isFilledOrder)?.avgFillPrice || null;
}

export function positionAvgPrice(
  action: OrderAction,
  {orders}: {orders: Array<Order>},
) {
  const {shares, value} = orders
    .filter(o => o.action === action && isFilledOrder(o))
    .reduce(
      (acc, o) => ({
        value: acc.value + o.shares * Number(o.avgFillPrice),
        shares: acc.shares + o.shares,
      }),
      {
        shares: 0,
        value: 0,
      },
    );

  return shares > 0 ? value / shares : 0;
}

export function positionAvgEntryPrice({orders}: {orders: Array<Order>}) {
  return positionAvgPrice(positionAction({orders}), {orders});
}

export function positionAvgExitPrice({orders}: {orders: Array<Order>}) {
  return positionAvgPrice(positionExitAction({orders}), {orders});
}
