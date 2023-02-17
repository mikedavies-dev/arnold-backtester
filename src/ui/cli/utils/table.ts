import Table from 'cli-table';

type Alignment = 'right' | 'left' | 'middle';

type Column = {
  label: string;
  width: number;
  align: Alignment;
};

type RenderArgs = {
  columns: Array<Column>;
  rows: string[][];
};

export function toString({rows, columns}: RenderArgs): string {
  const table = new Table({
    chars: {mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
    head: columns.map(c => c.label),
    colAligns: columns.map(c => c.align),
    colWidths: columns.map(c => c.width),
    rows,
  });

  return table.toString();
}

export function render(args: RenderArgs): void {
  const rendered = toString(args);
  console.log(rendered);
}
