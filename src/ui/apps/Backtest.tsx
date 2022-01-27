/*
Show an Omnibar to list the backtest results available, when one is selected load the details and
display the breakdown

https://blueprintjs.com/docs/#select/omnibar
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
