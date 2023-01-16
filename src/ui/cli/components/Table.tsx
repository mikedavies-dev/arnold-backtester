import {Box, Text} from 'ink';

export const TableCell = ({
  width,
  text,
  bold,
}: {
  width: number;
  text: string | number;
  bold?: boolean;
}) => {
  return (
    <Box width={width} marginRight={1}>
      <Text wrap="truncate" bold={bold}>
        {text}
      </Text>
    </Box>
  );
};

// TODO, make sure TData is only has string or numbers

export function Table<TData extends {id: string}>({
  data,
  columns,
}: {
  data: Array<TData>;
  columns: Array<{label: string; width: number; field: keyof TData}>;
}) {
  return (
    <Box flexDirection="column" width="100%">
      <Box>
        {columns.map(column => (
          <TableCell
            key={String(column.field)}
            width={column.width}
            text={column.label}
            bold
          />
        ))}
      </Box>

      {data.map(row => (
        <Box key={row.id}>
          {columns.map(column => (
            <TableCell
              key={`${row.id}_${String(column.field)}`}
              width={column.width}
              text={String(row[column.field])}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
