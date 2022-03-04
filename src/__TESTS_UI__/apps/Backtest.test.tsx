// https://github.com/testing-library/react-testing-library/issues/667
// https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning

import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {rest} from 'msw';
import {setupServer} from 'msw/node';

import Backtest from '../../ui/apps/Backtest';

import {
  testBacktestDetails,
  testBacktestResults,
} from '../test-data/backtest-results';

const server = setupServer(
  rest.get('/api/backtests', (req, res, ctx) => {
    return res(ctx.json(testBacktestResults));
  }),
  rest.get('/api/backtest/item2', (req, res, ctx) => {
    return res(ctx.json(testBacktestDetails));
  }),
);

beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test('loading results, selecting a result and clicking back', async () => {
  render(<Backtest />);

  expect(await screen.findByText(/item2/i)).toBeInTheDocument();

  const row = await screen.findByTestId(/item2/i);
  expect(row).toBeInTheDocument();

  // click the row
  userEvent.click(row);

  // Check that we are seeing the results
  await screen.findByText('Initial Deposit');

  expect(await screen.queryByText(/item2/i)).toBeFalsy();

  // Click the back button back to results
  userEvent.click(await screen.findByText(/back to results/i));
  expect(await screen.findByText(/item2/i)).toBeInTheDocument();
});
