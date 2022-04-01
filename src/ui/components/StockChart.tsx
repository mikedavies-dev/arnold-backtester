/*
This is kind of hacked together from another project, unfortunately react-stockcharts hasn't
been updated for a long time so at some point we'll have to swap this out, possibly for
react-financial-charts.

Unfortunately react-financial-charts hasn't been updated for a long time either so it isn't
compatible with React 17+ and it isn't a direct swap out for react-stockcharts so I've stuck
with the old module for now.

Hopefully react-financial-charts will be updated in the future and I have some time to swap it
over

https://github.com/rrag/react-stockcharts
https://github.com/react-financial/react-financial-charts

*/

import React from 'react';
import {format} from 'd3-format';
import equals from 'fast-deep-equal/react';
import {ChartCanvas, Chart} from 'react-stockcharts';
import {
  BarSeries,
  CandlestickSeries,
  // StraightLine,
} from 'react-stockcharts/lib/series';
import {YAxis} from 'react-stockcharts/lib/axes';
import {
  CrossHairCursor,
  MouseCoordinateY,
  EdgeIndicator,
} from 'react-stockcharts/lib/coordinates';
import {Label} from 'react-stockcharts/lib/annotation';
import {discontinuousTimeScaleProvider} from 'react-stockcharts/lib/scale';
import styled from 'styled-components';

import useDimensions from '../hooks/use-dimensions';

const ChartWrapper = styled.div`
  position: relative;
  height: 100%;
`;

const Theme = {
  red: '#ec5354',
  green: '#27a49d',
  edgeGreen: '#ffffff',
  edgeRed: '#ffffff',
  high: '#00BBF9',
  low: '#00BBF9',
  title: '#999999',
  xAxisTick: '#ffffff',
  xAxisEdge: '#666666',
  crosshair: '#ffffff',
};

type DataPoint = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function StockChart({
  barData,
  title,
}: {
  barData: Array<DataPoint>;
  title: string;
}) {
  const [ref, {height = 100, width = 100}] = useDimensions();

  const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(
    (d: DataPoint) => {
      return d.date;
    },
  );

  const {data, xScale, xAccessor, displayXAccessor} = xScaleProvider(barData);

  const margin = {
    left: 0,
    right: 45,
    top: 10,
    bottom: 10,
  };

  const volumeHeight = height * 0.2;

  return (
    <ChartWrapper ref={ref}>
      <ChartCanvas
        height={height}
        width={width}
        margin={margin}
        padding={10}
        type={'hybrid'}
        seriesName={title}
        data={data}
        ratio={1}
        xScale={xScale}
        xAccessor={xAccessor}
        displayXAccessor={displayXAccessor}
        mouseMoveEvent
        panEvent
        zoomEvent
        clamp
      >
        <Chart
          id={1}
          yExtents={[(d: DataPoint) => [d.high, d.low]]}
          padding={{top: 0, bottom: volumeHeight}}
        >
          <YAxis
            axisAt="right"
            orient="right"
            ticks={10}
            innerTickSize={-1 * 2000}
            tickStrokeDasharray="ShortDash"
            tickStrokeOpacity={0.1}
            tickStrokeWidth={1}
            tickStroke={Theme.xAxisTick}
            stroke={Theme.xAxisEdge}
          />
          <Label
            x={(width - margin.left - margin.right) / 2}
            y={height / 2}
            fontSize={25}
            opacity={0.5}
            text={title}
            fill={() => Theme.title}
          />
          <MouseCoordinateY
            at="right"
            orient="right"
            displayFormat={format('.2f')}
          />
          <CandlestickSeries
            stroke={(d: DataPoint) =>
              d.close > d.open ? Theme.green : Theme.red
            }
            wickStroke={(d: DataPoint) =>
              d.close > d.open ? Theme.green : Theme.red
            }
            fill={(d: DataPoint) =>
              d.close > d.open ? Theme.green : Theme.red
            }
            widthRatio={0.8}
          />
          <EdgeIndicator
            itemType="last"
            orient="right"
            edgeAt="right"
            fontSize={12}
            arrowWidth={5}
            yAccessor={(d: DataPoint) => d.close}
            fill={(d: DataPoint) =>
              d.close > d.open ? Theme.green : Theme.red
            }
            stroke={(d: DataPoint) =>
              d.close > d.open ? Theme.green : Theme.red
            }
            textFill={(d: DataPoint) =>
              d.close > d.open ? Theme.edgeGreen : Theme.edgeRed
            }
            strokeOpacity={1}
            strokeWidth={3}
            rectWidth={30}
          />
        </Chart>
        <Chart
          id={2}
          height={volumeHeight}
          yExtents={(d: DataPoint) => d.volume}
          origin={(w: number, h: number) => [0, h - volumeHeight]}
          padding={{top: 10, bottom: 0}}
        >
          <MouseCoordinateY
            at="right"
            orient="right"
            displayFormat={format('.4s')}
          />
          <BarSeries
            yAccessor={(d: DataPoint) => d.volume}
            fill={(d: DataPoint) =>
              d.close > d.open ? Theme.green : Theme.red
            }
          />
        </Chart>
        <CrossHairCursor stroke={Theme.crosshair} />
      </ChartCanvas>
    </ChartWrapper>
  );
}

export default React.memo(StockChart, (props, newProps) => {
  return equals(props, newProps);
});
