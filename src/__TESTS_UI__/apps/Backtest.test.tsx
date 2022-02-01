// https://github.com/testing-library/react-testing-library/issues/667
// https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning

import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {rest} from 'msw';
import {setupServer} from 'msw/node';

import Backtest from '../../ui/apps/Backtest';

const server = setupServer(
  rest.get('/api/backtests', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 'item2',
          createdAt: '2022-01-20T00:00:00.000Z',
          symbols: ['ZZZZ'],
          strategy: 'sample',
        },
      ]),
    );
  }),
  rest.get('/api/backtest/item2', (req, res, ctx) => {
    return res(
      ctx.json({
        // TODO, mock contents here
      }),
    );
  }),
);

beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test('Create an empty backtest component..', async () => {
  render(<Backtest />);

  expect(await screen.findByText(/item2/i)).toBeInTheDocument();

  const row = await screen.findByTestId(/item2/i);
  expect(row).toBeInTheDocument();

  // click the row
  userEvent.click(row);

  await screen.findByText('Some results');
});
