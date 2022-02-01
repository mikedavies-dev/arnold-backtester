import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {BacktestResultsPicker} from '../../ui/components/BacktestResultsPicker';

test('display an empty results list', async () => {
  render(<BacktestResultsPicker items={[]} onSelect={() => {}} />);
  expect(await screen.findByText(/Backtest Results/i)).toBeInTheDocument();
});

test('display a list of results and click a result', async () => {
  const handleSelect = jest.fn();
  render(
    <BacktestResultsPicker
      items={[
        {
          id: 'item1',
          createdAt: new Date(),
          strategy: 'sample',
          symbols: ['ZZZZ'],
        },
        {
          id: 'item2',
          createdAt: new Date(),
          strategy: 'sample',
          symbols: ['ZZZZ'],
        },
        {
          id: 'item3',
          createdAt: new Date(),
          strategy: 'sample',
          symbols: ['ZZZZ'],
        },
      ]}
      onSelect={handleSelect}
    />,
  );

  // Make sure the row is in the document
  const row = await screen.findByTestId(/item2/i);
  expect(row).toBeInTheDocument();

  // click the row
  userEvent.dblClick(row);

  // expect the handler to have been called
  expect(handleSelect).toHaveBeenCalledTimes(1);
});
