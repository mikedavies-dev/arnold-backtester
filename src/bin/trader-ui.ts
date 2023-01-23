import {run} from '../ui/cli/apps/trader';
import {
  getMarketClose,
  getMarketOpen,
  getPreMarketOpen,
  initMarket,
} from '../utils/market';
import {initTracker} from '../utils/tracker';

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

  const market = initMarket(new Date(), preMarketOpen, marketOpen, marketClose);

  ui.log(`Hello ${Math.random()}`);
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
        symbol: 'AAA',
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
        symbol: 'AAPL',
        tracker: initTracker(),
        profiles: [],
      },
      {
        symbol: 'AAPL',
        tracker: initTracker(),
        profiles: [],
      },
      {
        symbol: 'AAPL',
        tracker: initTracker(),
        profiles: [],
      },
      {
        symbol: 'AAPL',
        tracker: initTracker(),
        profiles: [],
      },
    ],
  });
}, 1000);
