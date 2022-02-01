// https://github.com/testing-library/react-testing-library/issues/667
// https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning

import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {rest} from 'msw';
import {setupServer} from 'msw/node';

import Backtest from '../../ui/apps/Backtest';

const server = setupServer(
  rest.get('/api/backtests', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '61e99b598dad9ede732903e6',
          createdAt: '2022-01-20T00:00:00.000Z',
          symbols: ['ZZZZ'],
          strategy: 'sample',
        },
      ]),
    );
  }),
);

beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test('Create an empty backtest component..', async () => {
  render(<Backtest />);
  // Click the open backtest button
  // userEvent.click(screen.getByText('Open Backtest'));

  // Expect to see the loader .. ?
  expect(
    await screen.findByText(/61e99b598dad9ede732903e6/i),
  ).toBeInTheDocument();
});
