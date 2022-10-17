import {loadSymbolLists} from '../../utils/symbol-lists';
import Env from '../../utils/env';

describe('symbol list tests', () => {
  test('parsing a simple list without a list lookup', async () => {
    const symbols = await loadSymbolLists(['AAPL', 'MSFT', 'GOOG']);
    expect(symbols).toEqual(expect.arrayContaining(['AAPL', 'MSFT', 'GOOG']));
  });

  test('parsing a simple list with an invalid list', async () => {
    await expect(async () => {
      await loadSymbolLists(['AAPL', 'MSFT', 'GOOG', '@INVALID']);
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `"List INVALID does not exist"`,
    );
  });

  test('parsing a simple list with a list lookup', async () => {
    const symbols = await loadSymbolLists(['AAPL', 'MSFT', 'GOOG', '@main']);
    expect(symbols).toEqual(
      expect.arrayContaining(['AAPL', 'MSFT', 'GOOG', 'TEST1', 'TEST2']),
    );
  });

  test('deduplicate a list', async () => {
    const symbols = await loadSymbolLists(['AAPL', 'AAPL', 'AAPL']);
    expect(symbols).toEqual(['AAPL']);
  });

  test('empty list file fails to parse the list', async () => {
    // Cause the test to fail to load the list file
    const old = Env.USER_FOLDER;
    Env.USER_FOLDER = './INVALID';
    await expect(async () => {
      await loadSymbolLists(['@main']);
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"List main does not exist"`);
    Env.USER_FOLDER = old;
  });
});
