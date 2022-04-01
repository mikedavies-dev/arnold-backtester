import styled from 'styled-components';

import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from 'recharts';

type DataPoint = {
  value: number;
};

const TooltipWrapper = styled.div`
  background-color: #30404d;
  border-radius: 4px;
  border: 1px solid #666;
  padding: 5px 8px;
`;

const TooltipContent = ({
  active,
  payload,
  formatter,
}: {
  active?: boolean;
  payload?: Array<DataPoint>;
  formatter: (value: number) => string;
}) => {
  if (active && payload && payload.length) {
    return <TooltipWrapper>{`${formatter(payload[0].value)}`}</TooltipWrapper>;
  }

  return null;
};

export default function SimpleLineChart({
  data,
  formatter,
}: {
  data: Array<DataPoint>;
  formatter: (value: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#666666" />
        <YAxis
          style={{fill: 'white'}}
          fill="white"
          tickFormatter={value => formatter(value)}
        />
        <Line
          dataKey="value"
          isAnimationActive={false}
          strokeWidth={2}
          stroke="#82ca9d"
        />
        <YAxis />
        <Tooltip content={<TooltipContent formatter={formatter} />} />
      </LineChart>
    </ResponsiveContainer>
  );
}
