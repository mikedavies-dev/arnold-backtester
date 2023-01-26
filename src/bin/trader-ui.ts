import {run} from '../ui/cli/apps/trader';
import {
  getMarketClose,
  getMarketOpen,
  getPreMarketOpen,
  initMarket,
} from '../utils/market';
import {initTracker} from '../utils/tracker';

try {
  const ui = run({
    onQuit: () => {
      // quit the trader..
      process.exit();

      // what can we do here?!
    },
  });

  setInterval(() => {
    const marketOpen = getMarketOpen(new Date());
    const preMarketOpen = getPreMarketOpen(new Date());
    const marketClose = getMarketClose(new Date());

    const market = initMarket(
      new Date(),
      preMarketOpen,
      marketOpen,
      marketClose,
    );

    ui.update({
      market: market,
      positions: [
        {
          symbol: 'AAA',
          orders: [],
          openedAt: new Date(),
          closedAt: new Date(),
          isClosing: false,
          closeReason: 'Test position',
          size: 100,
          data: {},
        },

        {
          symbol: 'BBB',
          orders: [],
          openedAt: new Date(),
          closedAt: new Date(),
          isClosing: false,
          closeReason: 'Test position',
          size: 100,
          data: {},
        },
        {
          symbol: 'CCC',
          orders: [],
          openedAt: new Date(),
          closedAt: new Date(),
          isClosing: false,
          closeReason: 'Test position',
          size: 100,
          data: {},
        },
        {
          symbol: 'DDD',
          orders: [],
          openedAt: new Date(),
          closedAt: new Date(),
          isClosing: false,
          closeReason: 'Test position',
          size: 100,
          data: {},
        },
      ],
      instruments: [
        {
          symbol: 'AAA',
          tracker: initTracker(),
          profiles: [
            {
              id: 'test',
              name: 'Test',
              currentlyInSetup: true,
            },
            {
              id: 'test12',
              name: 'Test12',
              currentlyInSetup: false,
            },
          ],
        },
        {
          symbol: 'BBB',
          tracker: initTracker(),
          profiles: [
            {
              id: 'test',
              name: 'Test',
              currentlyInSetup: false,
            },
          ],
        },
        {
          symbol: 'CCC',
          tracker: initTracker(),
          profiles: [],
        },
        {
          symbol: 'DDD',
          tracker: initTracker(),
          profiles: [],
        },
      ],
    });
  }, 1000);
} catch (err) {
  console.log('Failed', err);
  process.exit();
}
