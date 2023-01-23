import blessed from 'blessed';
import contrib from 'blessed-contrib';
import numeral from 'numeral';

import {TraderStatusUpdate} from '../../../core';
import Layout from '../utils/layout';

type UIArguments = {
  onQuit: () => void;
};

type UIResult = {
  log: (msg: string) => void;
  update: (args: TraderStatusUpdate) => void;
};

const InstrumentColumns = [
  {
    title: 'symbol',
    width: 10,
  },
  {
    title: 'last',
    width: 10,
  },
  {
    title: 'cng',
    width: 10,
  },
  {
    title: 'profiles',
    width: 100,
  },
];

const PositionColumns = [
  {
    title: 'symbol',
    width: 10,
  },
  {
    title: 'size',
    width: 10,
  },
  {
    title: 'closing',
    width: 10,
  },
  {
    title: 'open p&l',
    width: 15,
  },
  {
    title: 'realized p&l',
    width: 15,
  },
];

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
    }),
  );

  const positions = layout.append(
    contrib.table({
      keys: true,
      vi: true,
      fg: 'white',
      columnSpacing: 10,
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
          return [symbol, numeral(tracker.last).format('0,00'), '0'];
        },
      );

      instruments.setData({
        headers: InstrumentColumns.map(c => c.title),
        data: instrumentData,
      });

      const positionData = livePositions.map(position => {
        return [
          position.symbol,
          numeral(position.size).format('0,0'),
          position.isClosing ? 'Yes' : 'No',
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
