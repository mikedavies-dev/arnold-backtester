import {useReducer, useEffect} from 'react';
import {Button, ButtonGroup} from '@blueprintjs/core';

import {
  BacktestResultSummary,
  listBacktests,
  listBacktest,
  BacktestResultDetails,
} from '../api';

import BacktestResultsDetails from '../components/BacktestResultsDetails';
import BacktestResultsPicker from '../components/BacktestResultsPicker';
import LoadingIndicator from '../components/LoadingIndicator';

import Logger from '../../utils/logger';

const log = Logger('UI');

type AppState = {
  isLoading: boolean;
  results: Array<BacktestResultSummary>;
  details: BacktestResultDetails | null;
};

type Action =
  | {type: 'isLoading'; value: boolean}
  | {type: 'backtestResults'; value: Array<BacktestResultSummary>}
  | {type: 'details'; value: BacktestResultDetails | null};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'isLoading':
      return {
        ...state,
        isLoading: action.value,
      };

    case 'backtestResults':
      return {
        ...state,
        results: action.value,
      };

    case 'details':
      return {
        ...state,
        details: action.value,
      };
  }
}

export default function Backtest() {
  const [state, dispatch] = useReducer(reducer, {
    isLoading: false,
    results: [],
    details: null,
  });

  const loadBacktestResults = async () => {
    try {
      dispatch({type: 'isLoading', value: true});
      dispatch({type: 'backtestResults', value: await listBacktests()});
    } catch (err) {
      log('Failed', err);
    } finally {
      dispatch({type: 'isLoading', value: false});
    }
  };

  const handleSelectResult = async (result: BacktestResultSummary) => {
    try {
      dispatch({type: 'isLoading', value: true});
      dispatch({
        type: 'details',
        value: await listBacktest(result.id),
      });
    } catch (err) {
      log('Failed', err);
    } finally {
      dispatch({type: 'isLoading', value: false});
    }
  };

  // Load the initial results
  useEffect(() => {
    loadBacktestResults();
  }, []);

  const closeBacktestResult = () => {
    dispatch({
      type: 'details',
      value: null,
    });
  };

  return (
    <>
      <LoadingIndicator isOpen={state.isLoading} />
      {!state.details && (
        <>
          <ButtonGroup>
            <Button
              icon="refresh"
              text="Refresh Results"
              onClick={loadBacktestResults}
            />
          </ButtonGroup>
          <h2>Backtest Results</h2>
          <BacktestResultsPicker
            items={state.results}
            onSelect={handleSelectResult}
          />
        </>
      )}
      {state.details && (
        <>
          <ButtonGroup>
            <Button
              icon="undo"
              text="Back to results"
              onClick={closeBacktestResult}
            />
          </ButtonGroup>
          <h2>Backtest Results</h2>
          <BacktestResultsDetails details={state.details} />
        </>
      )}
    </>
  );
}
