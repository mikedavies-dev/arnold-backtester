import {Omnibar, ItemRenderer} from '@blueprintjs/select';
import {MenuItem, NonIdealState, ProgressBar} from '@blueprintjs/core';
import {format} from 'date-fns';

import {BacktestResultSummary} from '../api';

const dateFormatString = 'EEE MMM do - HH:mm';

function getText(result: BacktestResultSummary): string {
  return `${format(result.createdAt, dateFormatString)} - ${
    result.strategy
  } ${result.symbols.join(', ')}`.toLowerCase();
}

export const resultRenderer: ItemRenderer<BacktestResultSummary> = (
  result,
  {handleClick, modifiers},
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  const text = `${format(result.createdAt, dateFormatString)}`;
  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      label={`${result.strategy}: ${result.symbols.join(', ')}`}
      key={result.id}
      onClick={handleClick}
      text={text}
    />
  );
};

const BacktestResultsOmnibar = Omnibar.ofType<BacktestResultSummary>();

export function BacktestResultsPicker({
  items,
  isOpen,
  onClose,
  onSelect,
  isLoading,
}: {
  items: Array<BacktestResultSummary>;
  isOpen: boolean;
  isLoading: boolean;
  onSelect: (result: BacktestResultSummary) => void;
  onClose: () => void;
}) {
  return (
    <BacktestResultsOmnibar
      items={items}
      isOpen={isOpen}
      itemRenderer={resultRenderer}
      noResults={
        <NonIdealState
          icon={isLoading ? null : 'search'}
          title={isLoading ? '' : 'Nothing found'}
          description={isLoading ? <ProgressBar intent="primary" /> : ''}
        />
      }
      onItemSelect={onSelect}
      onClose={onClose}
      initialContent={undefined}
      itemListPredicate={(query, items) => {
        return items.filter(
          result => getText(result).indexOf(query.toLowerCase()) !== -1,
        );
      }}
    />
  );
}
