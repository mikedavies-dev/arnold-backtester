import {subDays} from 'date-fns';

import {getTestDate} from '../../test-utils/tick';
import {create as createIB} from '../../../utils/data-provider/providers/ib';

test('init ib', async () => {
  const ib = createIB();
  await ib.init();
});

test('get timeseries', async () => {
  const ib = createIB();
  const from = subDays(getTestDate(), 2);
  const to = getTestDate();
  const ts = await ib.getTimeSeries('ZZZZ', from, to, 'm1');
  expect(ts).toMatchInlineSnapshot(`Array []`);
});

test('instrument lookups', async () => {
  const ib = createIB();
  const results = await ib.instrumentLookup('MSFT');
  expect(results).toMatchInlineSnapshot(`Array []`);
});
