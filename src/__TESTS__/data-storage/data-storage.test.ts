import {ensureDataIsAvailable} from '../../utils/data-storage';

// Mocks
import {hasTsForSymbolAndDate} from '../../utils/tick-storage';
import {createDataProvider} from '../../utils/data-provider';
import {listAvailablePeriodsForSymbolAndDate} from '../../utils/db';

test('check data storage', () => {
  expect(1).toBe(1);
});
