import {getTestDate} from '../../test-utils/tick';
import {create as createIB} from '../../../utils/data-provider/providers/ib';

test('init ib', async () => {
  const ib = createIB();
  await ib.init();
});

test('get timeseries', async () => {
  const ib = createIB();
  const ts = await ib.getTimeSeries('ZZZZ', getTestDate(), 'm1');
  expect(ts).toMatchInlineSnapshot(`Array []`);
});
