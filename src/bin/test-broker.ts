import {create} from '../utils/data-provider/brokers/ib';
import {instrumentLookup, connect, disconnect} from '../utils/db';
import {create as createPositions} from '../utils/positions';

const {log} = console;

async function run() {
  try {
    log('Connecting to database');
    await connect();

    const positions = createPositions({log});
    await positions.init();

    const ib = create({
      log,
      positions,
    });

    log('Connecting to IB');
    await ib.init();

    // load an instrument
    const [instrument] = await instrumentLookup({
      provider: 'ib',
      symbols: ['AAPL'],
    });

    const orderId = ib.placeOrder({
      profileId: 'ABCD',
      instrument,
      order: {
        type: 'MKT',
        shares: 100,
        action: 'BUY',
      },
    });

    log('Order placed!', orderId);

    await new Promise(resolve => setTimeout(resolve, 3000000));

    await ib.shutdown();
    await disconnect();
  } catch (err) {
    log(err);
  }
}

run();
