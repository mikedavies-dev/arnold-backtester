import styled from 'styled-components';
import {format, differenceInSeconds} from 'date-fns';
import {HTMLTable, NonIdealState} from '@blueprintjs/core';
import {getPositionPL} from '../../utils/results-metrics';
import numeral from 'numeral';

import {Position} from '../../backtest/broker';

const Table = styled(HTMLTable)`
  width: 100%;
`;

type TdOptions = {
  width?: number | string;
  align?: 'left' | 'right' | 'center';
};

const Td = styled.td<TdOptions>`
  ${o => (o.width ? `width: ${o.width}` : '')};
  ${o => (o.align ? `text-align: ${o.align} !important` : '')};
`;

const Th = styled.th<TdOptions>`
  ${o => (o.width ? `width: ${o.width}` : '')};
  ${o => (o.align ? `text-align: ${o.align} !important` : '')};
`;

export default function PositionList({
  positions,
  onSelectPosition,
}: {
  positions: Position[];
  onSelectPosition: (position: Position) => void;
}) {
  return (
    <>
      {positions.length === 0 && (
        <NonIdealState icon="search" title="No positions found" />
      )}
      {positions.length > 0 && (
        <Table bordered striped condensed interactive>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Opened At</th>
              <th>Closed At</th>
              <Th align="right">Shares</Th>
              <Th align="right">Duration</Th>
              <Th align="right">PnL</Th>
              <Th align="right">Orders</Th>
              <th>Close Reason</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, ix) => {
              const [openOrder] = position.orders;
              const {shares} = openOrder;
              const closeOrder = position.orders[position.orders.length - 1];
              const closedAt = closeOrder.filledAt || closeOrder.openedAt;
              const durationInSeconds = differenceInSeconds(
                closedAt,
                openOrder.openedAt,
              );
              return (
                <tr key={ix} onClick={() => onSelectPosition(position)}>
                  <Td width="200px">{position.symbol}</Td>
                  <Td>{format(openOrder.openedAt, 'HH:mm:ss')}</Td>
                  <Td>{format(closedAt, 'HH:mm:ss')}</Td>
                  <Td align="right">{numeral(shares).format('0,0')}</Td>
                  <Td align="right">
                    {durationInSeconds < 60
                      ? `${durationInSeconds}s`
                      : `${(durationInSeconds / 60).toFixed(2)}m`}
                  </Td>
                  <Td align="right">
                    {numeral(getPositionPL(position)).format('$0,0.00')}
                  </Td>
                  <Td align="right">
                    {numeral(position.orders.length).format('0,0')}
                  </Td>
                  <Td>{position.closeReason}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
