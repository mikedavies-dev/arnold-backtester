import {Box, Text} from 'ink';
type StatusElement = {
  id: string;
  text: string;
  color?: string;
  backgroundColor?: string;
};

export default function StatusLine({
  width,
  elements,
}: {
  width: number;
  elements: Array<StatusElement>;
}) {
  const padding = 1;

  const widthUsed = elements.reduce((acc, {text}) => {
    return acc + text.length + padding * 2;
  }, 0);

  const defaultBackground = 'gray';

  const fillWidth = width - widthUsed;

  return (
    <Box>
      {elements.map(({id, text, color, backgroundColor}) => {
        return (
          <Text
            backgroundColor={backgroundColor || defaultBackground}
            key={id}
            color={color || 'white'}
            bold
          >
            {Array(padding)
              .fill(0)
              .map(() => ' ')}
            {text}
            {Array(padding)
              .fill(0)
              .map(() => ' ')}
          </Text>
        );
      })}
      {fillWidth > 0 && (
        <Box>
          <Text backgroundColor={defaultBackground}>
            {Array(fillWidth)
              .fill(0)
              .map(() => ' ')}
          </Text>
        </Box>
      )}
    </Box>
  );
}
