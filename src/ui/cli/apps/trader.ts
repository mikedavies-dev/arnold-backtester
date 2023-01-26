import blessed from 'blessed';
import contrib from 'blessed-contrib';
import numeral from 'numeral';
import colors from 'colors';

import {TraderStatusUpdate, Tracker} from '../../../core';
import Layout from '../utils/layout';
import {formatTime} from '../../../utils/dates';

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

const InstrumentColumns = [
  {
    title: 'sym',
    width: 4,
  },
  {
    title: 'last',
    width: 6,
  },
  {
    title: 'cng',
    width: 6,
  },
  {
    title: 'vol',
    width: 6,
  },
  {
    title: 'profiles',
    width: 100,
  },
];

const PositionColumns = [
  {
    title: 'id',
    width: 10,
  },
  {
    title: 'opened',
    width: 10,
  },
  {
    title: 'profile',
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
  const color = colorize(val);
  return color(numeral(val).format('0.00'));
}

function thousands(val: number) {
  const color = colorize(val);
  return color(numeral(val).format('0,0'));
}

function percent(val: number) {
  const color = colorize(val);
  return color(numeral(val).format('0.00%'));
}

export function run({onQuit}: UIArguments): UIResult {
  const screen = blessed.screen();
  const program = blessed.program();

  const [layout, instruments] = Layout(
    screen,
    contrib.table({
      keys: true,
      vi: true,
      bottom: 2,
      fg: 'white',
      columnSpacing: 10,
      columnWidth: InstrumentColumns.map(c => c.width),
      selectedFg: 'gray',
    }),
  );

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
    10,
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
    instruments.focus();
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
      const instrumentData = liveInstruments.map(
        ({symbol, tracker, profiles}) => {
          return [
            symbol,
            decimal(tracker.last),
            percent(percentChange(tracker)),
            thousands(tracker.volume),
            profiles.map(p => `${p.name}`).join(', '),
          ];
        },
      );

      instruments.setData({
        headers: InstrumentColumns.map(c => c.title),
        data: instrumentData,
      });

      const trackers = liveInstruments.reduce((acc, {symbol, tracker}) => {
        acc.set(symbol, tracker);
        return acc;
      }, new Map<string, Tracker>());

      const positionData = livePositions.map(position => {
        const tracker = trackers.get(position.symbol);
        return [
          'test',
          formatTime(position.openedAt),
          'profileId',
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
