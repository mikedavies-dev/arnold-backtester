import React from 'react';
import ReactDOM from 'react-dom';

import {TestComponent} from '../../ui/TestComponent';

test('React testing sanity check..', () => {
  const div = document.createElement('div');
  ReactDOM.render(<TestComponent />, div);
  const input = div.querySelector('input');
  expect(input).not.toBe(null);
  expect(input?.value).toBe('123');
  expect(input).not.toBeDisabled();
});
