import React from 'react';
import ReactDOM from 'react-dom';

import Backtest from '../../ui/apps/Backtest';

test('Create an empty backtest component..', () => {
  const div = document.createElement('div');
  ReactDOM.render(<Backtest />, div);
});
