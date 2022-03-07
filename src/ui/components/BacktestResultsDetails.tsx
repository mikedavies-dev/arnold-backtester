import {Classes} from '@blueprintjs/core';
import classNames from 'classnames';
import styled from 'styled-components';
import numeral from 'numeral';

import {BacktestResultDetails} from '../api';
import SimpleBarChart from './SimpleBarChart';
import {MetricsByPeriod} from '../../utils/results-metrics';

const MetricWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
`;

const MetricColumn = styled.td`
  width: 33%;
`;

type Metric = {
  name: string;
  format: string;
  value: number;
};

const ChartWrapper = styled.div`
  display: flex;
  height: 300px;
  margin-bottom: 40px;

  > div {
    flex-grow: 1;
    width: 100%;
  }
`;

const ChartTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  margin-top: 20px;
  margin-bottom: 10px;
`;

function MetricValue({metric}: {metric: Metric | null}) {
  if (!metric) {
    return <MetricWrapper>&nbsp;</MetricWrapper>;
  }
  return (
    <MetricWrapper>
      <div>{metric.name}</div>
      <div>{numeral(metric.value).format(metric.format)}</div>
    </MetricWrapper>
  );
}

const Formats = {
  Number: '0,0',
  Currency: '$0,0',
  CurrencyWithCents: '$0,0.00',
  Percent: '0.00%',
};

function metric(name: string, value: number, format: string): Metric {
  return {
    name,
    value,
    format,
  };
}

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getChartData(
  metrics: MetricsByPeriod[],
  field: keyof MetricsByPeriod,
  labelFormatter: (val: number) => string,
  valueFormatter: (val: number) => string,
) {
  return metrics
    .map((entry, ix) => ({
      name: labelFormatter(ix),
      value: entry[field],
      label: valueFormatter(entry[field]),
    }))
    .filter(v => v.value);
}

export default function BacktestResultsDetails({
  details,
}: {
  details: BacktestResultDetails;
}) {
  const {metrics} = details;

  const grid = [
    // Column 1
    [
      metric('Initial Deposit', metrics.accountSize, Formats.Currency),
      metric('Gross Profit', metrics.grossProfit, '$0,0.00'),
      metric('Gross Loss', metrics.grossLoss, '$0,0.00'),
      metric('Gross Profit & Loss', metrics.grossProfitAndLoss, '$0,0.00'),
      null,
      metric('Commission', metrics.commission, '$0,0.00'),
      metric('Net Profit & Loss', metrics.netProfitAndLoss, '$0,0.00'),
      null,
      metric('Profit Factor', metrics.profitFactor, '0.00'),
    ],
    // Column 2
    [
      metric('Max Drawdown', metrics.maxDrawdown, Formats.CurrencyWithCents),
      null,
      metric(
        'Max Consecutive Wins',
        metrics.maxConsecutiveWins,
        Formats.Number,
      ),
      metric(
        'Max Consecutive Win $',
        metrics.maxConsecutiveWinAmount,
        Formats.CurrencyWithCents,
      ),
      null,
      metric(
        'Max Consecutive Losses',
        metrics.maxConsecutiveLosses,
        Formats.Number,
      ),
      metric(
        'Max Consecutive Loss $',
        metrics.maxConsecutiveLossAmount,
        Formats.CurrencyWithCents,
      ),
    ],
    // Column 3
    [
      metric('Positions', metrics.positions, Formats.Number),
      metric('Orders', metrics.orders, Formats.Number),
      null,
      metric('Long Positions', metrics.longPositions, Formats.Number),
      metric('Long Winners', metrics.longWinners, Formats.Number),
      metric('Long Winner %', metrics.longWinnerPercent, Formats.Percent),
      null,
      metric('Short Positions', metrics.shortPositions, Formats.Number),
      metric('Short Winners', metrics.shortWinners, Formats.Number),
      metric('Short Winner %', metrics.shortWinnerPercent, Formats.Percent),
    ],
  ];

  const rowCount = grid.reduce((acc, rows) => Math.max(acc, rows.length), 0);

  return (
    <>
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
          {Array(rowCount)
            .fill(0)
            .map((_, ix) => {
              return (
                <tr key={`row_${ix}`}>
                  {grid
                    .map(column => column[ix] || null)
                    .map((metric, row) => (
                      <MetricColumn key={`metric_${ix}_${row}`}>
                        <MetricValue metric={metric} />
                      </MetricColumn>
                    ))}
                </tr>
              );
            })}
        </tbody>
      </table>
      <ChartWrapper>
        <>
          <div>
            <ChartTitle>Profit and Loss - By Day</ChartTitle>
            <SimpleBarChart
              data={getChartData(
                metrics.byDayOfWeek,
                'grossProfitAndLoss',
                val => days[val],
                val => numeral(val).format('$0.00'),
              )}
            />
          </div>
          <div>
            <ChartTitle>Profit and Loss - By Hour</ChartTitle>
            <SimpleBarChart
              data={getChartData(
                metrics.byHour,
                'grossProfitAndLoss',
                val => `${val}h`,
                val => numeral(val).format('$0.00'),
              )}
            />
          </div>
        </>
      </ChartWrapper>
      <ChartWrapper>
        <>
          <div>
            <ChartTitle>Orders - By Day</ChartTitle>
            <SimpleBarChart
              data={getChartData(
                metrics.byDayOfWeek,
                'positions',
                val => days[val],
                val => numeral(val).format('0,0'),
              )}
            />
          </div>
          <div>
            <ChartTitle>Orders - By Hour</ChartTitle>
            <SimpleBarChart
              data={getChartData(
                metrics.byHour,
                'positions',
                val => `${val}h`,
                val => numeral(val).format('0,0'),
              )}
            />
          </div>
        </>
      </ChartWrapper>
    </>
  );
}
