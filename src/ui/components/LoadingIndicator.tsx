import {Overlay, Classes, ProgressBar} from '@blueprintjs/core';
import styled from 'styled-components';

const CenterWrapper = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const ProgressWrapper = styled.div`
  width: 300px;
`;

export default function LoadingIndicator({isOpen}: {isOpen: boolean}) {
  return (
    <Overlay isOpen={isOpen} className={Classes.OVERLAY_SCROLL_CONTAINER}>
      <CenterWrapper>
        <ProgressWrapper>
          <ProgressBar intent="primary" />
        </ProgressWrapper>
      </CenterWrapper>
    </Overlay>
  );
}
