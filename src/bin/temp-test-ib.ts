import Logger from '../utils/logger';
import {createDataProvider} from '../utils/data-provider';

const log = Logger('ensure-data');

async function run() {
  try {
    const dataProvider = createDataProvider({
      log: (...args) => {
        console.log(args);
      },
    });

    // Connect to data provider
    try {
      await dataProvider.init();

      await new Promise(resolve => setTimeout(resolve, 3000));

      const instruments = await dataProvider.instrumentLookup('MSFT');
      log(JSON.stringify(instruments));
    } catch (err) {
      log('Failed to connect to the data provider, check connection', err);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 120000));
  } catch (err) {
    log(`Failed to run load data`, err);
  }
}

run();
