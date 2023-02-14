import {create as createPolygon} from '../../../utils/data-provider/providers/polygonio';

describe('test the polygonio data provider', () => {
  test('instrument lookups', async () => {
    const polygon = createPolygon();
    await polygon.init();
    const results = await polygon.instrumentLookup('MSFT');

    expect(
      results.find(r => r.name.indexOf('MICROSOFT CORP') !== -1),
    ).toBeTruthy();

    await polygon.shutdown();
  });
});
