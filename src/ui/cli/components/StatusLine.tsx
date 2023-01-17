import {Box, Text, Spacer} from 'ink';
import {Fragment} from 'react';

type StatusElement = {
  id: string;
  text: string;
  color?: string;
  backgroundColor?: string;
};

function Line({items}: {items: Array<StatusElement>}) {
  return (
    <>
      {items.map(({id, text, color}, ix) => {
        return (
          <Fragment key={id}>
            <Text color={color || 'white'} bold>
              {text}
            </Text>
            {ix < items.length - 1 && <Text color="white">&nbsp;│&nbsp;</Text>}
          </Fragment>
        );
      })}
    </>
  );
}

export default function StatusLine({
  left,
  right,
}: {
  left: Array<StatusElement>;
  right: Array<StatusElement>;
}) {
  return (
    <Box borderStyle="single">
      <Line items={left} />
      <Spacer />
      <Line items={right} />
    </Box>
  );
}
