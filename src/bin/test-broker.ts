import {create} from '../utils/data-provider/brokers/ib';
import {instrumentLookup, connect, disconnect} from '../utils/db';
import {create as createPositions} from '../utils/positions';

const {log} = console;

const sleep = (timeout: number) =>
  new Promise(resolve => setTimeout(resolve, timeout));

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

    const buyOrderId = ib.placeOrder({
      profileId: 'ABCD',
      instrument,
      order: {
        type: 'MKT',
        shares: 1100,
        action: 'SELL',
      },
    });

    log('Buy order placed!', buyOrderId);

    await sleep(10000);

    await positions.writeDbUpdates();

    ib.closePosition('ABCD', instrument, 'Test closing the position');

    // await sleep(5000);

    // await positions.writeDbUpdates();

    // const sellOrderId = ib.placeOrder({
    //   profileId: 'ABCD',
    //   instrument,
    //   order: {
    //     type: 'MKT',
    //     shares: 100,
    //     action: 'SELL',
    //   },
    // });

    // log('Sell order placed!', sellOrderId);

    // eslint-disable-next-line
    while (true) {
      // dump data to the database
      await positions.writeDbUpdates();

      await sleep(1000);
    }

    await ib.shutdown();
    await disconnect();
  } catch (err) {
    log(err);
  }
}

run();
