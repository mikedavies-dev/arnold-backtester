/* globals window */

import React, {useLayoutEffect, useState, useRef} from 'react';

import styled from 'styled-components';

function getGridPosition(
  gridResolution: number,
  gridSize: number,
  position: number,
) {
  return (gridSize / gridResolution) * position;
}

type TopLevelWrapperProps = {
  zIndex: number;
};

const TopLevelWrapper = styled.div<TopLevelWrapperProps>`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #30404d;
  z-index: ${a => a.zIndex};
`;

const FrameWrapper = styled.div`
  border-radius: 2px;
  position: absolute;
  background: rgba(255, 255, 255, 0.02);
  padding: 3px;
  cursor: grab;
`;

const FrameContainer = styled.div`
  background-color: #30404d;
  height: 100%;
  width: 100%;
  cursor: default;
  overflow: hidden;
`;

const BottomRightDragger = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  padding: 0 3px 3px 0;
  cursor: se-resize;
`;

const TopRightDragger = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  width: 20px;
  height: 20px;
  padding: 0 3px 3px 0;
  cursor: ne-resize;
`;

const TopLeftDragger = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  padding: 0 3px 3px 0;
  cursor: nw-resize;
`;

const BottomLeftDragger = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  padding: 0 3px 3px 0;
  cursor: sw-resize;
`;

type ResizeSettings = {
  handleResize: any;
  positionKey: string;
  clientX: number;
  clientY: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type FramePosition = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  index: number;
};

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}

export function FrameManager(props: {
  children: any;
  gridResolution: number;
  positions: Record<string, FramePosition>;
  onReposition: any;
  zIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLElement>;
}) {
  const {
    children,
    gridResolution,
    positions,
    onReposition,
    zIndex = 10,
    onKeyDown,
    onKeyUp,
  } = props;

  // get the window's width height
  const [windowWidth, windowHeight] = useWindowSize();
  const [resizeSettings, setResizeSettings] = useState<ResizeSettings | null>(
    null,
  );

  const wrapperElement = useRef<any>();

  const handleStartResize = (settings: ResizeSettings) => {
    setResizeSettings(settings);
  };

  const handleStopResize = () => {
    setResizeSettings(null);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!resizeSettings || !wrapperElement.current) {
      return;
    }

    // Calculate width delta
    const deltaX = event.clientX - resizeSettings.clientX;
    const width = wrapperElement.current.clientWidth;
    const blockWidth = width / gridResolution;
    const deltaWidth = deltaX / blockWidth;

    // Calculate height delta
    const deltaY = event.clientY - resizeSettings.clientY;
    const height = wrapperElement.current.clientHeight;
    const blockHeight = height / gridResolution;
    const deltaHeight = deltaY / blockHeight;

    // Resize the component
    resizeSettings.handleResize(resizeSettings, deltaHeight, deltaWidth);

    if (event.stopPropagation) {
      event.stopPropagation();
    }

    if (event.preventDefault) {
      event.preventDefault();
    }

    // TODO, do we need this?
    // event.cancelBubble = true;
    // event.returnValue = false;
    return false;
  };

  // https://stackoverflow.com/questions/32370994/how-to-pass-props-to-this-props-children
  const childrenWithProps = React.Children.map(children, child => {
    // Checking isValidElement is the safe way and avoids a typescript
    // error too.
    if (React.isValidElement(child)) {
      const key = String(child.key || '');

      return React.cloneElement(child as React.ReactElement<any>, {
        gridResolution,
        windowWidth,
        windowHeight,
        handleStartResize,
        handleStopResize,
        isResizing: resizeSettings?.positionKey === key,
        positionKey: key,
        position: positions[key || ''] || {
          top: 10,
          left: 10,
          right: 20,
          bottom: 20,
          index: 0,
        },
        onResize: (position: FramePosition) => {
          /*
          const current = positions[key];
          if (
            position.top === current.top
            && position.left === current.left
            && position.right === current.right
            && position.bottom === current.bottom
          ) {
            return;
          }
          */

          // Always bring the resizing frame to the front
          const sortedFrames = [
            key,
            ...Object.keys(positions)
              .sort((key1, key2) => {
                return (
                  (positions[key2].index || 0) - (positions[key1].index || 0)
                );
              })
              .filter(k => k !== key),
          ];

          const newPositions = sortedFrames.reduce((acc, key, ix) => {
            const newPosition = key === key ? position : positions[key];

            acc[key] = {
              ...newPosition,
              index: sortedFrames.length - ix,
            };
            return acc;
          }, {} as Record<string, FramePosition>);

          // window.dispatchEvent(new Event('resize'));
          onReposition(newPositions);
        },
      });
    }
    return child;
  });

  return (
    <TopLevelWrapper
      onMouseUp={handleStopResize}
      onMouseMove={ev => handleMouseMove(ev)}
      ref={wrapperElement}
      zIndex={zIndex}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {childrenWithProps}
    </TopLevelWrapper>
  );
}

export function Frame(props: {
  position?: any;
  children?: any;
  gridResolution?: number;
  windowHeight?: number;
  windowWidth?: number;
  handleStartResize?: any;
  handleStopResize?: any;
  onResize?: any;
  isResizing?: boolean;
  positionKey?: string;
}) {
  const {
    position,
    children,
    gridResolution,
    windowWidth,
    windowHeight,
    handleStartResize,
    handleStopResize,
    onResize,
    isResizing,
    positionKey,
  } = props;

  if (!gridResolution || !windowHeight || !windowWidth || !position) {
    return null;
  }

  const handleResize = (
    resizeSettings: ResizeSettings,
    deltaHeight: number,
    deltaWidth: number,
  ) => {
    onResize({
      ...position,
      top: Math.floor(position.top - deltaHeight * resizeSettings.top),
      bottom: Math.ceil(position.bottom - deltaHeight * resizeSettings.bottom),
      left: Math.floor(position.left - deltaWidth * resizeSettings.left),
      right: Math.ceil(position.right - deltaWidth * resizeSettings.right),
    });
  };

  const {top, bottom, left, right} = position;

  return (
    <FrameWrapper
      style={{
        // Height
        top: getGridPosition(gridResolution, windowHeight, top),
        bottom: getGridPosition(gridResolution, windowHeight, bottom),

        // Width
        left: getGridPosition(gridResolution, windowWidth, left),
        right: getGridPosition(gridResolution, windowWidth, right),

        zIndex: position.index,
      }}
      onMouseDown={event => {
        onResize(position);

        handleStartResize({
          handleResize,
          positionKey,
          clientX: event.clientX,
          clientY: event.clientY,
          top: -1,
          left: -1,
          bottom: 1,
          right: 1,
        });
      }}
      onMouseUp={handleStopResize}
    >
      <FrameContainer
        onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => {
          if (event.stopPropagation) {
            event.stopPropagation();
          }

          // TODO, do we need this??
          // event.cancelBubble = true;
          // event.returnValue = false;

          return false;
        }}
      >
        {!isResizing && children}
        <BottomRightDragger
          onMouseDown={event => {
            onResize(position);

            handleStartResize({
              handleResize,
              positionKey,
              clientX: event.clientX,
              clientY: event.clientY,
              top: 0,
              left: 0,
              bottom: 1,
              right: 1,
            });
          }}
          onMouseUp={handleStopResize}
        />
        <TopRightDragger
          onMouseDown={event => {
            onResize(position);

            handleStartResize({
              handleResize,
              positionKey,
              clientX: event.clientX,
              clientY: event.clientY,
              top: -1,
              left: 0,
              bottom: 0,
              right: 1,
            });
          }}
          onMouseUp={handleStopResize}
        />
        <TopLeftDragger
          onMouseDown={event => {
            onResize(position);

            handleStartResize({
              handleResize,
              positionKey,
              clientX: event.clientX,
              clientY: event.clientY,
              top: -1,
              left: -1,
              bottom: 0,
              right: 0,
            });
          }}
          onMouseUp={handleStopResize}
        />
        <BottomLeftDragger
          onMouseDown={event => {
            onResize(position);

            handleStartResize({
              handleResize,
              positionKey,
              clientX: event.clientX,
              clientY: event.clientY,
              top: 0,
              left: -1,
              bottom: 1,
              right: 0,
            });
          }}
          onMouseUp={handleStopResize}
        />
      </FrameContainer>
    </FrameWrapper>
  );
}
