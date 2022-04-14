import {subDays} from 'date-fns';

import {getTestDate} from '../../test-utils/tick';
import {create as createIB} from '../../../utils/data-provider/providers/ib';
import Env from '../../../utils/env';

/*
These will only work if IB is running... how can we test this in CI?
*/

test('keep jest happy', async () => {});

if (!Env.DISABLE_PROVIDER_TESTS) {
  test('init ib', async () => {
    const ib = createIB();
    await ib.init();
    await ib.shutdown();
  });

  test('get timeseries', async () => {
    const ib = createIB();
    expect(Env.isTesting).toBeTruthy();
    expect(Env.IB_PORT).toMatchInlineSnapshot(`"4002"`);
    const from = subDays(getTestDate(), 2);
    const to = getTestDate();
    const ts = await ib.getTimeSeries('ZZZZ', from, to, 'm1');
    expect(ts).toMatchInlineSnapshot(`Array []`);
    await ib.shutdown();
  });

  test('instrument lookups', async () => {
    const ib = createIB();
    await ib.init();
    const results = await ib.instrumentLookup('MSFT');

    expect(results.find(r => r.name === 'MICROSOFT CORP')).toBeTruthy();
    await ib.shutdown();
  });
}
