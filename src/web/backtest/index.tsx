import React from 'react';
import ReactDom from 'react-dom';

import Backtest from '../../ui/apps/Backtest';

const container = document.getElementById('container');

if (container) {
  ReactDom.render(<Backtest />, container);
}
