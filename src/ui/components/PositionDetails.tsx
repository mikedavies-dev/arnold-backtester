import {useMemo} from 'react';
import styled from 'styled-components';
import {parseISO} from 'date-fns';

import {useHotkeys} from '@blueprintjs/core';

import {FrameManager, Frame} from './ReactWindowFrames';

import StockChart from './StockChart';

import {initialData} from '../temp/data';

const data = initialData.map(d => {
  return {
    ...d,
    date: parseISO(d.date),
  };
});

const defaultFramePositions = {
  market_time: {
    top: 0,
    left: 87,
    right: 0,
    bottom: 95,
    index: 5,
  },
  summary: {
    top: 0,
    left: 75,
    right: 0,
    bottom: 0,
    index: 6,
  },
  spy_1_minute: {
    top: 0,
    left: 0,
    right: 62,
    bottom: 42,
    index: 8,
  },
  spy_minute: {
    top: 0,
    left: 0,
    right: 62,
    bottom: 42,
    index: 2,
  },
  stock_1_minute: {
    top: 0,
    left: 38,
    right: 25,
    bottom: 42,
    index: 10,
  },
  stock_5_minute: {
    top: 58,
    left: 38,
    right: 25,
    bottom: 0,
    index: 4,
  },
  stock_daily: {
    top: 58,
    left: 0,
    right: 62,
    bottom: 0,
    index: 3,
  },
  stock_minute: {
    top: 0,
    left: 38,
    right: 24,
    bottom: 42,
    index: 1,
  },
};

const FrameContents = styled.div`
  padding: 5px;
  height: 100%;
`;

export default function PositionDetails({onClose}: {onClose: () => void}) {
  const hotkeys = useMemo(
    () => [
      {
        combo: 'Esc',
        global: true,
        label: 'Close',
        onKeyDown: () => {
          onClose();
        },
      },
    ],
    [],
  );
  const {handleKeyDown, handleKeyUp} = useHotkeys(hotkeys);

  return (
    <FrameManager
      gridResolution={100}
      positions={defaultFramePositions}
      zIndex={100}
      onReposition={
        (/*newPositions: any*/) => {
          // don't do anything at the moment
        }
      }
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <Frame key="spy_1_minute">
        <FrameContents>
          <StockChart title="SPY / 1M" barData={data} />
        </FrameContents>
      </Frame>
      <Frame key="stock_1_minute">
        <FrameContents>
          <StockChart title="1M" barData={data} />
        </FrameContents>
      </Frame>
      <Frame key="stock_5_minute">
        <FrameContents>
          <StockChart title="5M" barData={data} />
        </FrameContents>
      </Frame>
      <Frame key="stock_daily">
        <FrameContents>
          <StockChart title="DAILY" barData={data} />
        </FrameContents>
      </Frame>
      <Frame key="summary">
        <FrameContents />
      </Frame>
    </FrameManager>
  );
}
