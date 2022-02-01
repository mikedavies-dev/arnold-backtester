import styled from 'styled-components';
import {format} from 'date-fns';
import {HTMLTable, Button} from '@blueprintjs/core';

import {BacktestResultSummary} from '../api';

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

export function BacktestResultsPicker({
  items,
  onSelect,
}: {
  items: Array<BacktestResultSummary>;
  onSelect: (result: BacktestResultSummary) => void;
}) {
  return (
    <>
      <h2>Backtest Results</h2>
      <Table bordered striped condensed interactive>
        <thead>
          <tr>
            <th>Backtest ID</th>
            <th>Started At</th>
            <th>Strategy</th>
            <th>Symbols</th>
            <th>Positions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(result => {
            return (
              <tr
                key={result.id}
                data-testid={result.id}
                onDoubleClick={() => onSelect(result)}
              >
                <Td width="110px">{result.id}</Td>
                <Td width="200px">
                  {format(result.createdAt, 'EEE MMM do - HH:mm')}
                </Td>
                <Td>{result.strategy}</Td>
                <Td>{result.symbols.join(', ')}</Td>
                <Td width="100px">0</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
