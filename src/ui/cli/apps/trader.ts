import blessed from 'blessed';
import contrib from 'blessed-contrib';
import numeral from 'numeral';
import colors from 'colors/safe';

import {LineIndicator, TraderStatusUpdate, Tracker} from '../../../core';
import Layout from '../utils/layout';
import {formatTime} from '../../../utils/dates';
import {
  create as createTable,
  render as renderTable,
  Column,
} from '../components/table';

import {
  positionOpenPnL,
  positionSize,
  positionRealisedPnL,
  percentChange,
} from '../../../utils/derived';

export type UIArguments = {
  onQuit: () => void;
  onCommand: (command: string, args: string[]) => void;
  onLog: (msg: string, ...args: any[]) => void;
  onSelectSymbol: (symbol: string) => void;
};

export type UIResult = {
  log: (msg: string) => void;
  update: (args: TraderStatusUpdate) => void;
  quit: () => void;
};

// indicators to show in the grid
import {latest} from '../../../utils/indicators';

import RetraceFromHigh from '../../../indicators/RetraceFromHigh';
import ATR from '../../../indicators/ATR';

export function calcAndLatest(indicator: LineIndicator): number {
  indicator.recalculate();
  return latest(indicator);
}

const InstrumentColumns: Column[] = [
  {
    title: 'sym',
    width: 6,
    align: 'LEFT',
  },
  {
    title: 's',
    width: 1,
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
    title: '%cng',
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
    title: 'atr(14)',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'retrace',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: '-high',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'setup',
    width: 30,
    align: 'LEFT',
  },
];

const PositionColumns: Column[] = [
  {
    title: 'id',
    width: 10,
    align: 'LEFT',
  },
  {
    title: 'profile',
    width: 10,
    align: 'LEFT',
  },
  {
    title: 'opened',
    width: 10,
    align: 'LEFT',
  },
  {
    title: 'sym',
    width: 4,
    align: 'LEFT',
  },
  {
    title: 'size',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'left',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'open',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'p&l',
    width: 8,
    align: 'RIGHT',
  },
  {
    title: 'closed',
    width: 10,
    align: 'RIGHT',
  },
  {
    title: 'reason',
    width: 20,
    align: 'LEFT',
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

export function run({
  onQuit,
  onCommand,
  // onLog,
  onSelectSymbol,
}: UIArguments): UIResult {
  const screen = blessed.screen();
  const program = blessed.program();

  const instruments = createTable({
    keys: true,
    vi: true,
    fg: 'white',
    selectedFg: 'gray',
    selectedBg: 'white',
    interactive: true,
  });

  const [layout] = Layout(screen, instruments.container);

  const positions = createTable({
    keys: true,
    vi: true,
    fg: 'white',
    selectedFg: 'gray',
    selectedBg: 'white',
    interactive: true,
  });

  layout.append(positions.container, 10, true);

  const log = layout.append(
    contrib.log({
      border: {},
    }),
    0,
    true,
  );

  const status = layout.append(
    blessed.box({
      width: '100%',
      bg: 'grey',
      content: '',
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
    onQuit();
  }

  input.key('enter', function () {
    const [, data] = input.content.trim().split(':');

    const [command, ...args] = data.split(' ');

    switch (command) {
      case 'q':
        exit();
        break;

      default:
        onCommand(command, args);
        break;
    }

    toggleCommandInput();
  });

  program.key('C-p', function () {
    positions.list.focus();
    screen.render();
  });

  program.key('C-s', function () {
    instruments.list.focus();
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
  instruments.list.focus();

  let listSymbols: string[] = [];

  // this isn't nice but we don't have a way of getting the data from the row
  instruments.list.on('select', (_, index) => {
    const symbol = listSymbols[index] || null;

    if (symbol) {
      onSelectSymbol(listSymbols[index]);
    }
  });

  return {
    log: msg => {
      log.log(msg);
      screen.render();
    },
    update: ({
      instruments: liveInstruments,
      positions: livePositions,
      market,
    }) => {
      const profileLookup = new Map<string, string>();

      listSymbols = liveInstruments.map(i => i.symbol);

      const instrumentData = liveInstruments.map(
        ({symbol, tracker, profiles}) => {
          profiles.forEach(({id, name}) => {
            profileLookup.set(id, name);
          });

          const pcntChange = percentChange(tracker);
          const color = colorize(pcntChange);

          return [
            symbol,
            profiles.some(p => p.currentlyInSetup)
              ? colors.green('✓')
              : colors.red('˟'),
            decimal(tracker.last),
            color(decimal(tracker.last - tracker.prevClose)),
            color(percent(pcntChange)),
            decimal(tracker.open),
            decimal(tracker.high),
            decimal(tracker.low),
            thousands(tracker.volume),
            decimal(tracker.bid),
            decimal(tracker.ask),
            decimal(tracker.ask - tracker.bid),
            decimal(calcAndLatest(ATR(14, tracker.bars.m5))),
            decimal(calcAndLatest(RetraceFromHigh(tracker.bars.m5))),
            decimal(tracker.high - tracker.last),
            profiles
              .filter(p => p.currentlyInSetup)
              .map(p => `${p.name}`)
              .join(', '),
          ];
        },
      );

      renderTable(instruments, {
        headers: InstrumentColumns,
        data: instrumentData,
      });

      const trackers = liveInstruments.reduce((acc, {symbol, tracker}) => {
        acc.set(symbol, tracker);
        return acc;
      }, new Map<string, Tracker>());

      const positionData = livePositions.reverse().map(position => {
        const tracker = trackers.get(position.symbol);
        return [
          position.externalId.substring(0, 8),
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

      renderTable(positions, {
        headers: PositionColumns,
        data: positionData,
      });

      status.setContent(`{green-bg}{grey-fg}{bold} ${market.current.time} {/}`);

      screen.render();
    },
    quit: () => {
      program.clear();
      program.disableMouse();
      program.showCursor();
      program.normalBuffer();
    },
  };
}
