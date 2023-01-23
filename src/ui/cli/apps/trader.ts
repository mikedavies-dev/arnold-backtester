import blessed from 'blessed';
import contrib from 'blessed-contrib';
import numeral from 'numeral';
import {TraderStatusUpdate} from '../../../core';
import Layout from '../components/PanelLayout';

type UIArguments = {
  onQuit: () => void;
};

type UIResult = {
  log: (msg: string) => void;
  update: (args: TraderStatusUpdate) => void;
};

export function run({onQuit}: UIArguments): UIResult {
  // Main screen
  const screen = blessed.screen();
  const program = blessed.program();

  const Heights = {
    LOG: 10,
    STATUS: 1,
  } as const;

  // const layout = Layout(instruments);

  const instruments = contrib.table({
    keys: true,
    vi: true,
    width: '50%',
    left: '0',
    bottom: 2,
    top: '0',
    fg: 'white',
    columnSpacing: 10,
    columnWidth: [16, 12, 12],
  });

  screen.append(instruments);

  const positions = contrib.table({
    width: '50%',
    keys: true,
    vi: true,
    left: '50%',
    bottom: 2,
    top: '0',
    fg: 'white',
    columnSpacing: 10,
    columnWidth: [16, 12],
  });

  screen.append(positions);

  // create the system log
  const log = contrib.log({
    bottom: 1,
    height: Heights.LOG + 1,
    width: '100%',
    border: {},
  });

  screen.append(log);

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

  const status = blessed.box({
    height: Heights.STATUS,
    width: '100%',
    bg: 'grey',
    content: '{green-bg}{grey-fg}{bold} CONNECTED {/}',
    tags: true,
  });

  screen.append(status);

  const splitV = blessed.line({
    orientation: 'vertical',
    left: '50%',
    width: 1,
    bottom: 2,
    fg: 'grey',
  });
  screen.append(splitV);

  const splitH = blessed.line({
    orientation: 'horizontal',
    left: '0',
    height: 1,
    bottom: 2,
    fg: 'grey',
  });
  screen.append(splitH);

  function setComponentPositions() {
    let bottom = input.hidden ? 0 : 1;

    status.bottom = bottom;
    bottom += Heights.STATUS;

    log.bottom = bottom;
    bottom += Heights.LOG;

    splitH.bottom = bottom;
    splitV.bottom = bottom;

    instruments.bottom = bottom;
    positions.bottom = bottom;
  }

  function toggleCommandInput() {
    if (input.hidden) {
      input.setValue(':');
      input.show();
      input.focus();
    } else {
      input.clearValue();
      input.hide();
    }

    setComponentPositions();
    screen.render();
  }

  // setInterval(() => {
  //   const data = Array(Math.ceil(Math.random() * 100) + 75)
  //     .fill(0)
  //     .map(() => [Math.random().toFixed(2), Math.random().toFixed(2)]);
  //
  //   instruments.setData({
  //     headers: ['col1', 'col2'],
  //     data,
  //   });
  //
  //   positions.setData({
  //     headers: ['col1', 'col2'],
  //     data,
  //   });
  //
  //   log.log(`Some random message ${Math.random()}`);
  //
  //   screen.render();
  // }, 100);

  function exit() {
    input.hide();
    screen.render();
    program.clear();
    program.disableMouse();
    program.showCursor();
    program.normalBuffer();

    onQuit();
  }

  function appendLog(msg: string) {
    log.log(msg);
    screen.render();
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

  program.key(':', function () {
    if (input.hidden) {
      toggleCommandInput();
      screen.render();
    }
  });

  program.alternateBuffer();
  program.enableMouse();
  program.clear();

  setComponentPositions();
  screen.render();

  return {
    log: msg => {
      appendLog(msg);
    },
    update: ({instruments: liveInstruments}) => {
      appendLog(`${liveInstruments.length}`);
      // const data = {
      //   headers: ['symbol', 'last', '%', 'vol', 'setup'],
      //   data: liveInstruments.map(({symbol, tracker, profiles}) => {
      //     return [
      //       symbol,
      //       numeral(tracker.last).format('0,00'),
      //       '0%',
      //       numeral(tracker.volume).format('0,0'),
      //       profiles.map(p => p.name).join(', '),
      //     ];
      //   }),
      // };
      // instruments.setData(data);

      screen.render();
      const data = liveInstruments.map(({symbol, tracker, profiles}) => {
        return [symbol, numeral(tracker.last).format('0,00'), '0'];
      });

      instruments.setData({
        headers: ['symbol', 'last', 'cng'],
        data,
      });

      positions.setData({
        headers: ['col1', 'col2'],
        data,
      });

      log.log(`Some random message ${Math.random()}`);

      screen.render();
    },
  };
}
