import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Backtest from '../../ui/apps/Backtest';

test('Create an empty backtest component..', () => {
  render(<Backtest />);

  // Click the open backtest button
  userEvent.click(screen.getByText('Open Backtest'));

  // Expect to see the loader .. ?
});
