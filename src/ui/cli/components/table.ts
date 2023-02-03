// format a table
import {box as createBox, list as createList, Widgets} from 'blessed';

import {stripAnsi} from '../utils/ansi';

type Options = Widgets.BoxOptions & {
  interactive: boolean;
  vi: boolean;
  keys: boolean;
  selectedBg: string;
  selectedFg: string;
};

export type Column = {
  width: number;
  title: string;
  align: 'LEFT' | 'RIGHT';
};

type RenderArgs = {
  headers: Array<Column>;
  data: string[][];
};

type Table = {
  list: Widgets.ListElement;
  container: Widgets.BoxElement;
};

export function create(options: Partial<Options>): Table {
  // create the main container
  const container = createBox({
    ...options,
    tags: true,
  });

  // create the list and add it to the container
  const list = createList({
    top: 1,
    width: '100%',
    left: 0,
    bottom: 0,
    keys: options.keys || false,
    vi: options.vi || false,
    interactive: options.interactive || false,
    style: {
      selected: {
        fg: options.selectedFg || 'black',
        bg: options.selectedBg || 'blue',
      },
    },
  });

  container.append(list);
  list.focus();

  return {
    list,
    container,
  };
}

function length(val: string) {
  return stripAnsi(val).length;
}

function renderLine(columns: Column[], data: string[]) {
  return data
    .map((value, index) => {
      const {width, align} = columns[index] as Column;
      const padding = ''.padStart(Math.max(width - length(value), 0));
      return align === 'RIGHT' ? padding + value : value + padding;
    })
    .join('  ');
}

export function render({list, container}: Table, {headers, data}: RenderArgs) {
  const header = renderLine(
    headers,
    headers.map(h => h.title),
  );
  container.setContent(`{bold}${header}{/bold}`);
  list.setItems(data.map(data => renderLine(headers, data)) as any);
}
