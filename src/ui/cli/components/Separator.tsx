import {Box, Text} from 'ink';

export function Separator({height}: {height: number}) {
  return (
    <Box paddingRight={1} paddingLeft={1} flexDirection="column">
      {Array((height || 0) - 3)
        .fill(0)
        .map((v, ix) => {
          return <Text key={ix}>│</Text>;
        })}
    </Box>
  );
}
