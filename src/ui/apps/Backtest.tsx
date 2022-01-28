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

import {useReducer} from 'react';

import {Button, ButtonGroup, NonIdealState} from '@blueprintjs/core';

type AppState = {
  isOpen: boolean;
};

type Action =
  | {type: 'request'}
  | {type: 'success'; results: Array<any>}
  | {type: 'failure'; error: string};

function reducer(state: AppState, action: Action) {
  switch (action.type) {
    case 'failure':
      return state;
  }
  return state;
}

export default function Backtest() {
  const [state, dispatch] = useReducer(reducer, {
    isOpen: false,
  });

  return (
    <>
      <ButtonGroup>
        <Button icon="folder-open" text="Open Backtest" />
      </ButtonGroup>
      <NonIdealState
        icon="search"
        title="No search results"
        description="No results found"
      />
    </>
  );
}
