import blessed from 'blessed';
import contrib from 'blessed-contrib';
import numeral from 'numeral';
import colors from 'colors/safe';

import {TraderStatusUpdate, Tracker} from '../../../core';
import Layout from '../utils/layout';
import {formatTime} from '../../../utils/dates';
import * as Table from '../components/table';

import {
  positionOpenPnL,
  positionSize,
  positionRealisedPnL,
  percentChange,
} from '../../../utils/derived';

type UIArguments = {
  onQuit: () => void;
};

type UIResult = {
  log: (msg: string) => void;
  update: (args: TraderStatusUpdate) => void;
};

const InstrumentColumns: Table.Column[] = [
  {
    title: 'sym',
    width: 6,
    align: 'LEFT',
  },
  {
    title: 'last',
    width: 6,
    align: 'RIGHT',
  },
  {
    title: 'cng',
    width: 10,
    align: 'RIGHT',
  },
  {
    title: 'open',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'high',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'low',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'vol',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'bid',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'ask',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'spread',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'profiles',
    width: 30,
    align: 'LEFT',
  },
];

const PositionColumns = [
  {
    title: 'id',
    width: 10,
  },
  {
    title: 'profile',
    width: 10,
  },
  {
    title: 'opened',
    width: 10,
  },
  {
    title: 'sym',
    width: 4,
  },
  {
    title: 'size',
    width: 4,
  },
  {
    title: 'left',
    width: 4,
  },
  {
    title: 'open',
    width: 6,
  },
  {
    title: 'p&l',
    width: 6,
  },
  {
    title: 'closed',
    width: 10,
  },
  {
    title: 'reason',
    width: 20,
  },
];

function colorize(val: number) {
  if (val === 0) {
    return colors.white;
  }

  return val > 0 ? colors.green : colors.red;
}

function decimal(val: number) {
  return numeral(val).format('0.00');
}

function thousands(val: number) {
  return numeral(val).format('0.0a');
}

function percent(val: number) {
  return numeral(val).format('0.00%');
}

export function run({onQuit}: UIArguments): UIResult {
  const screen = blessed.screen();
  const program = blessed.program();

  const instruments = Table.create({
    keys: true,
    vi: true,
    bottom: 2,
    fg: 'white',
    columnSpacing: 10,
    columnWidth: InstrumentColumns.map(c => c.width),
    selectedFg: 'gray',
    selectedBg: 'white',
    interactive: true,
  });

  const [layout] = Layout(screen, instruments.container);

  const positions = layout.append(
    contrib.table({
      keys: true,
      vi: true,
      fg: 'white',
      columnSpacing: 8,
      columnWidth: PositionColumns.map(c => c.width),
    }),
    30,
    true,
  );

  const log = layout.append(
    contrib.log({
      border: {},
    }),
    0,
    true,
  );

  layout.append(
    blessed.box({
      width: '100%',
      bg: 'grey',
      content: '{green-bg}{grey-fg}{bold} CONNECTED {/}',
      tags: true,
    }),
    1,
    false,
  );

  const input = blessed.textarea({
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    input: true,
    inputOnFocus: true,
    mouse: true,
    clickable: true,
    hidden: true,
    content: '',
    style: {
      fg: 'white',
    },
  });

  screen.append(input);

  function toggleCommandInput() {
    if (input.hidden) {
      input.setValue(':');
      input.show();
      input.focus();
    } else {
      input.clearValue();
      input.hide();
    }

    screen.render();
  }

  function exit() {
    program.clear();
    program.disableMouse();
    program.showCursor();
    program.normalBuffer();

    onQuit();
  }

  input.key('enter', function () {
    const data = input.content.trim();

    const [, command] = data.split(':');

    switch (command) {
      case 'q':
        exit();
        break;
    }

    toggleCommandInput();
  });

  program.key('C-p', function () {
    positions.focus();
    screen.render();
  });

  program.key('C-s', function () {
    instruments.container.focus();
    screen.render();
  });

  program.key('C-c', function () {
    exit();
  });

  program.key(':', function () {
    if (input.hidden) {
      toggleCommandInput();
      screen.render();
    }
  });

  program.alternateBuffer();
  program.enableMouse();
  program.clear();
  screen.render();

  return {
    log: msg => {
      log.log(msg);
      screen.render();
    },
    update: ({instruments: liveInstruments, positions: livePositions}) => {
      const profileLookup = new Map<string, string>();

      const instrumentData = liveInstruments.map(
        ({symbol, tracker, profiles}) => {
          profiles.forEach(({id, name}) => {
            profileLookup.set(id, name);
          });
          const pcntChange = percentChange({
            ...tracker,
            // todo, we need to load the CLOSE tick from IB
            close: tracker.open,
          });

          const color = colorize(pcntChange);
          return [
            symbol,
            decimal(tracker.last),
            color(percent(pcntChange)),
            decimal(tracker.open),
            decimal(tracker.high),
            decimal(tracker.low),
            thousands(tracker.volume),
            decimal(tracker.bid),
            decimal(tracker.ask),
            decimal(tracker.ask - tracker.bid),
            profiles.map(p => `${p.name}`).join(', '),
          ];
        },
      );

      Table.render(instruments, {
        headers: InstrumentColumns,
        data: instrumentData,
      });

      const trackers = liveInstruments.reduce((acc, {symbol, tracker}) => {
        acc.set(symbol, tracker);
        return acc;
      }, new Map<string, Tracker>());

      const positionData = livePositions.map(position => {
        const tracker = trackers.get(position.symbol);
        return [
          position.externalId,
          profileLookup.get(position.profileId) || 'unknown',
          formatTime(position.openedAt),
          position.symbol,
          numeral(positionSize(position)).format('0,0'),
          numeral(position.size).format('0,0'),
          decimal(tracker ? positionOpenPnL(position, tracker) : 0),
          decimal(positionRealisedPnL(position)),
          position.closedAt ? formatTime(position.closedAt) : '',
          position.closeReason || '',
        ];
      });

      positions.setData({
        headers: PositionColumns.map(c => c.title),
        data: positionData,
      });

      screen.render();
    },
  };
}
