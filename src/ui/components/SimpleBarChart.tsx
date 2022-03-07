import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

type DataPoint = {
  name: string;
  value: number;
  label: string;
};

export default function SimpleBarChart({data}: {data: Array<DataPoint>}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#666666" />
        <XAxis
          style={{fill: 'white'}}
          dataKey="name"
          color="white"
          fill="white"
        />
        <Bar stackId="a" dataKey="value" isAnimationActive={false}>
          {data.map((entry, ix) => (
            <Cell fill={entry.value > 0 ? '#C6EBC9' : '#FF7878'} key={ix} />
          ))}
          <LabelList dataKey="label" position="top" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
