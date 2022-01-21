import Logger from '../../../utils/logger';

test('file exists', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const log = Logger('Test Logger');
  expect(log).toMatchInlineSnapshot(`[Function]`);
  log('Test Logger');
});
