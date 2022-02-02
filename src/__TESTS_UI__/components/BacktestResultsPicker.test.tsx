import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import BacktestResultsPicker from '../../ui/components/BacktestResultsPicker';

test('display an empty results list and check for no results indicator', async () => {
  render(<BacktestResultsPicker items={[]} onSelect={() => {}} />);
  expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
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
          positions: 0,
        },
        {
          id: 'item2',
          createdAt: new Date(),
          strategy: 'sample',
          symbols: ['ZZZZ'],
          positions: 0,
        },
        {
          id: 'item3',
          createdAt: new Date(),
          strategy: 'sample',
          symbols: ['ZZZZ'],
          positions: 0,
        },
      ]}
      onSelect={handleSelect}
    />,
  );

  // Make sure the row is in the document
  const row = await screen.findByTestId(/item2/i);
  expect(row).toBeInTheDocument();

  // click the row
  userEvent.click(row);

  // expect the handler to have been called
  expect(handleSelect).toHaveBeenCalledTimes(1);
});
