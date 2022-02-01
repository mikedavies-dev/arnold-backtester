/*
Show an Omnibar to list the backtest results available, when one is selected load the details and
display the breakdown

https://blueprintjs.com/docs/#select/omnibar

## TODO

# API:
- API to load results summary list (date/time, symbols, strategy, etc)
- API to load the full results details - including calculated stats or
  should we calculate stats on the client so we can adjust settings?

# CLIENT:
- When the page loads show a progress load the current list of backtests
- After loading show an omnibar with the results so the user can choose one
- Each time the Open Backtest button is pressed, re-load the results from the server
- When a backtest is selected, load the positions from the server and calculate stats

# Testing!
*/

import {useReducer, useEffect} from 'react';
import {Button, ButtonGroup} from '@blueprintjs/core';

import {BacktestResultSummary, listBacktests} from '../api';
import Logger from '../../utils/logger';
import {BacktestResultsPicker} from '../components/BacktestResultsPicker';

const log = Logger('UI');

type AppState = {
  isLoadingResults: boolean;
  resultsPickerIsOpen: boolean;
  selectedResult: BacktestResultSummary | null;
  results: Array<BacktestResultSummary>;
};

type Action =
  | {type: 'openResultsPicker'}
  | {type: 'loadedBacktestResults'; results: Array<BacktestResultSummary>}
  | {type: 'toggleLoadingResults'; isLoading: boolean}
  | {type: 'setSelectedResult'; selected: BacktestResultSummary}
  | {type: 'closeResultsPicker'};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'openResultsPicker':
      return {
        ...state,
        resultsPickerIsOpen: true,
      };

    case 'toggleLoadingResults':
      return {
        ...state,
        isLoadingResults: action.isLoading,
      };

    case 'loadedBacktestResults':
      return {
        ...state,
        results: action.results,
      };

    case 'closeResultsPicker':
      return {
        ...state,
        resultsPickerIsOpen: false,
      };

    case 'setSelectedResult':
      return {
        ...state,
        selectedResult: action.selected,
      };
  }
}

export default function Backtest() {
  const [state, dispatch] = useReducer(reducer, {
    isLoadingResults: false,
    resultsPickerIsOpen: false,
    selectedResult: null,
    results: [],
  });

  const loadBacktestResults = async () => {
    try {
      dispatch({type: 'toggleLoadingResults', isLoading: true});
      dispatch({type: 'loadedBacktestResults', results: await listBacktests()});
    } catch (err) {
      log('Failed to load results', err);
    } finally {
      dispatch({type: 'toggleLoadingResults', isLoading: false});
    }
  };

  useEffect(() => {
    loadBacktestResults();
  }, []);

  const handleSelectResult = (result: BacktestResultSummary) => {
    log('Picked result', result);
    dispatch({type: 'setSelectedResult', selected: result});
  };

  return (
    <>
      <ButtonGroup>
        <Button icon="refresh" text="Refresh" onClick={loadBacktestResults} />
      </ButtonGroup>
      <BacktestResultsPicker
        items={state.results}
        onSelect={handleSelectResult}
      />
    </>
  );
}
