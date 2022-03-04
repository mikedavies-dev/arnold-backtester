import {Classes} from '@blueprintjs/core';
import classNames from 'classnames';
import styled from 'styled-components';
import numeral from 'numeral';

import {BacktestResultDetails} from '../api';

const MetricWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
`;

const MetricColumn = styled.td`
  width: 33%;
`;

function MetricValue({
  name,
  value,
  format,
}: {
  name: string;
  value: number;
  format: string;
}) {
  return (
    <MetricWrapper>
      <div>{name}</div>
      <div>{numeral(value).format(format)}</div>
    </MetricWrapper>
  );
}

const Formats = {
  Number: '0,0',
  Currency: '$0,0',
  CurrencyWithCents: '$0,0.00',
};

export default function BacktestResultsDetails({
  details,
}: {
  details: BacktestResultDetails;
}) {
  const {metrics} = details;

  const grid = [
    // Column 1
    [
      {
        name: 'Initial Deposit',
        value: metrics.accountSize,
        format: Formats.Currency,
      },
      {
        name: 'Gross Profit',
        value: metrics.grossProfit,
        format: '$0,0.00',
      },
      {
        name: 'Gross Loss',
        value: metrics.grossLoss,
        format: '$0,0.00',
      },
      {
        name: 'Gross Profit & Loss',
        value: metrics.grossProfitAndLoss,
        format: '$0,0.00',
      },
      null,
      {
        name: 'Commission',
        value: metrics.commission,
        format: '$0,0.00',
      },
      {
        name: 'Net Profit & Loss',
        value: metrics.netProfitAndLoss,
        format: '$0,0.00',
      },
      null,
      {
        name: 'Profit Factor',
        value: metrics.profitFactor,
        format: '0.00',
      },
      null,
      {name: 'Positions', value: metrics.positions, format: Formats.Number},
      {name: 'Orders', value: metrics.orders, format: Formats.Number},
      null,
    ],
    // Column 2
    [
      {
        name: 'Max Drawdown',
        value: metrics.maxDrawdown,
        format: Formats.CurrencyWithCents,
      },
      null,
      {
        name: 'Max Consecutive Wins',
        value: metrics.maxConsecutiveWins,
        format: Formats.Number,
      },
      {
        name: 'Max Consecutive Wins $',
        value: metrics.maxConsecutiveWinAmount,
        format: Formats.CurrencyWithCents,
      },
      null,
      {
        name: 'Max Consecutive Losses',
        value: metrics.maxConsecutiveLosses,
        format: Formats.Number,
      },
      {
        name: 'Max Consecutive Loss $',
        value: metrics.maxConsecutiveLossAmount,
        format: Formats.CurrencyWithCents,
      },
    ],
    // Column 3
    [{name: 'Positions', value: metrics.positions, format: Formats.Number}],
  ];

  const [rows] = grid;

  return (
    <table
      width="100%"
      className={classNames(
        Classes.HTML_TABLE,
        Classes.HTML_TABLE_BORDERED,
        Classes.HTML_TABLE_STRIPED,
        Classes.HTML_TABLE_CONDENSED,
      )}
    >
      <tbody>
        {rows.map((_, ix) => {
          return (
            <tr key={`row_${ix}`}>
              {grid
                .map(column => column[ix] || null)
                .map((metric, row) => (
                  <MetricColumn key={`metric_${ix}_${row}`}>
                    {metric && (
                      <MetricValue
                        name={metric.name}
                        value={metric.value}
                        format={metric.format}
                      />
                    )}
                  </MetricColumn>
                ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
