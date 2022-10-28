/*
Some kind of sanity wrapper around IB :) This sort of matches IBApiNext but supports some things
that we need like reqHistoricalData with keepUpToDate.
*/

import {
  IBApi,
  EventName,
  Contract,
  BarSizeSetting,
  Bar,
  HistoricalTickLast,
  HistoricalTickBidAsk,
  ContractDescription,
  ContractDetails,
  IBApiTickType,
  Order,
  OrderState,
  ErrorCode,
} from '@stoqey/ib';

export function init({
  host = '127.0.0.1',
  port = 4002,
}: {
  host: string;
  port: number;
}) {
  const api = new IBApi({
    host,
    port,
  });

  let nextRequestId = 0;
  let nextValidOrderId = 0;

  type OpenPosition = {
    account: string;
    contract: Contract;
    position: number;
    avgCost?: number;
  };

  const openPositions: Record<number, OpenPosition> = {};

  function getNextRequestId() {
    return nextRequestId++;
  }

  function getNextOrderId() {
    return nextValidOrderId++;
  }

  type IbEventHandler = {
    [EventName.connected]: () => void;
    [EventName.historicalData]: (bar: Bar) => void;
    [EventName.historicalDataUpdate]: (bar: Bar) => void;
    [EventName.historicalTicksLast]: (
      ticks: HistoricalTickLast[],
      done: boolean,
    ) => void;
    [EventName.historicalTicksBidAsk]: (
      ticks: HistoricalTickBidAsk[],
      done: boolean,
    ) => void;
    [EventName.symbolSamples]: (
      contractDescriptions: ContractDescription[],
    ) => void;
    [EventName.contractDetails]: (contractDetails: ContractDetails) => void;
    [EventName.contractDetailsEnd]: () => void;
    [EventName.tickPrice]: (field: string, value: number) => void;
    [EventName.tickSize]: (field: string, value: number) => void;
    [EventName.tickString]: (field: string, value: string) => void;
    [EventName.error]: (err: Error, code: ErrorCode) => void;
    // [EventName.openOrder]: (
    //   orderId: number,
    //   contract: Contract,
    //   order: Order,
    //   state: OrderState,
    // ) => void;
    // [EventName.openOrderEnd]: () => void;
  };

  const requests: Record<number, Partial<IbEventHandler>> = {};
  const globalHandlers: Record<string, Partial<IbEventHandler>> = {};

  // IB Message handlers
  api.on(EventName.all, (event, args) => {
    console.log('IB', event, args);
  });

  api.on(EventName.nextValidId, orderId => {
    nextValidOrderId = orderId;
  });

  api.on(
    EventName.historicalData,
    (reqId, time, open, high, low, close, volume, count, WAP) =>
      requests[reqId]?.[EventName.historicalData]?.({
        time,
        open,
        high,
        low,
        close,
        volume,
        count,
        WAP,
      }),
  );

  api.on(
    EventName.historicalDataUpdate,
    (reqId, time, open, high, low, close, volume, count, WAP) =>
      requests[reqId]?.[EventName.historicalDataUpdate]?.({
        time,
        open,
        high,
        low,
        close,
        volume,
        count,
        WAP,
      }),
  );

  api.on(EventName.historicalTicksLast, (reqId, ticks, done) =>
    requests[reqId]?.[EventName.historicalTicksLast]?.(ticks, done),
  );

  api.on(EventName.historicalTicksBidAsk, (reqId, ticks, done) =>
    requests[reqId]?.[EventName.historicalTicksBidAsk]?.(ticks, done),
  );

  api.on(EventName.symbolSamples, (reqId, contractDescriptions) =>
    requests[reqId]?.[EventName.symbolSamples]?.(contractDescriptions),
  );

  api.on(EventName.contractDetails, (reqId, contractDetails) =>
    requests[reqId]?.[EventName.contractDetails]?.(contractDetails),
  );

  api.on(EventName.contractDetailsEnd, reqId =>
    requests[reqId]?.[EventName.contractDetailsEnd]?.(),
  );

  api.on(EventName.tickPrice, (reqId, type, value /*, attributes*/) =>
    requests[reqId]?.[EventName.tickPrice]?.(IBApiTickType[type], value),
  );

  api.on(EventName.tickSize, (reqId, type, value) => {
    if (!type || !value) {
      return;
    }
    requests[reqId]?.[EventName.tickSize]?.(IBApiTickType[type], value);
  });

  api.on(EventName.tickString, (reqId, type, value) =>
    requests[reqId]?.[EventName.tickString]?.(IBApiTickType[type], value),
  );

  api.on(EventName.openOrder, (orderId, contract, order, state) => {
    /*
    1. Update the db
    2. If the order is not 'CANCELLED' or 'FILLED' (?) keep/update it in open orders
    3. If the order is 'CANCELLED' or 'FILLED' then remove it from openOrders
    */
    // If the order is open then store it in open orders
    // Otherwise just update the DB
  });

  // api.on(EventName.openOrder, (orderId, contract, order, state) =>
  //   globalHandlers['OPEN_ORDERS']?.[EventName.openOrder]?.(
  //     orderId,
  //     contract,
  //     order,
  //     state,
  //   ),
  // );

  // api.on(EventName.openOrderEnd, () =>
  //   globalHandlers['OPEN_ORDERS']?.[EventName.openOrderEnd]?.(),
  // );

  api.on(
    EventName.position,
    (
      account: string,
      contract: Contract,
      position: number,
      avgCost?: number,
    ) => {
      if (!contract.conId) {
        return;
      }
      openPositions[contract.conId] = {
        account,
        contract,
        position,
        avgCost,
      };
    },
  );

  api.on(EventName.error, (error, code, reqId) =>
    requests[reqId]?.[EventName.error]?.(error, code),
  );

  function addRequestHandler(reqId: number, handlers: Partial<IbEventHandler>) {
    requests[reqId] = handlers;
  }

  function removeRequestHandler(reqId: number) {
    delete requests[reqId];
  }

  function addGlobalHandler(name: string, handlers: Partial<IbEventHandler>) {
    globalHandlers[name] = handlers;
  }

  function removeGlobalHandler(name: string) {
    delete globalHandlers[name];
  }

  async function connect(clientId: number) {
    return new Promise<void>((resolve, reject) => {
      const timeoutTimer = setTimeout(async () => {
        await api.disconnect();
        reject(new Error('Timeout connecting to IB'));
      }, 10000);

      api.on(EventName.connected, () => {
        clearTimeout(timeoutTimer);
        setTimeout(resolve, 200);

        // Load any open positions
        api.reqPositions();
      });

      api.connect(clientId);
    });
  }

  async function disconnect() {
    return new Promise<void>(resolve => {
      api.on(EventName.disconnected, () => {
        resolve();
      });
      api.disconnect();
    });
  }

  async function getHistoricalTicksBidAsk(
    contract: Contract,
    startDateTime: string,
    endDateTime: string,
    numberOfTicks: number,
    useRTH: number,
    ignoreSize: boolean,
  ) {
    return new Promise<HistoricalTickBidAsk[]>(resolve => {
      const reqId = getNextRequestId();
      let data: HistoricalTickBidAsk[] = [];

      addRequestHandler(reqId, {
        [EventName.historicalTicksBidAsk]: (ticks, done) => {
          data = data.concat(ticks);

          if (done) {
            removeRequestHandler(reqId);
            resolve(ticks);
          }
        },
      });

      api.reqHistoricalTicks(
        reqId,
        contract,
        startDateTime,
        endDateTime,
        numberOfTicks,
        'BID_ASK',
        useRTH,
        ignoreSize,
      );
    });
  }

  async function getHistoricalTicksLast(
    contract: Contract,
    startDateTime: string,
    endDateTime: string,
    numberOfTicks: number,
    useRTH: number,
  ) {
    return new Promise<HistoricalTickLast[]>(resolve => {
      const reqId = getNextRequestId();
      let data: HistoricalTickLast[] = [];

      addRequestHandler(reqId, {
        [EventName.historicalTicksLast]: (ticks, done) => {
          data = data.concat(ticks);

          if (done) {
            removeRequestHandler(reqId);
            resolve(ticks);
          }
        },
      });

      api.reqHistoricalTicks(
        reqId,
        contract,
        startDateTime,
        endDateTime,
        numberOfTicks,
        'TRADES',
        useRTH,
        false,
      );
    });
  }

  async function getHistoricalData(
    contract: Contract,
    endDateTime: string,
    durationStr: string,
    barSizeSetting: BarSizeSetting,
    whatToShow: string,
    useRTH: number,
    formatDate: number,
  ) {
    return new Promise<Bar[]>(resolve => {
      const reqId = getNextRequestId();
      const bars: Bar[] = [];

      addRequestHandler(reqId, {
        [EventName.historicalData]: bar => {
          if (bar.open === -1) {
            removeRequestHandler(reqId);
            resolve(bars);
          } else {
            bars.push(bar);
          }
        },
      });

      api.reqHistoricalData(
        reqId,
        contract,
        endDateTime,
        durationStr,
        barSizeSetting,
        whatToShow,
        useRTH,
        formatDate,
        false,
      );
    });
  }

  function requestBarUpdates(
    contract: Contract,
    barSizeSetting: BarSizeSetting,
    whatToShow: string,
    useRTH: number,
    formatDate: number,
    onUpdateBar?: ((bar: Bar) => void) | null,
  ) {
    const reqId = getNextRequestId();

    addRequestHandler(reqId, {
      [EventName.historicalData]: () => {},
      [EventName.historicalDataUpdate]: bar => {
        onUpdateBar?.(bar);
      },
    });

    api.reqHistoricalData(
      reqId,
      contract,
      '',
      '1 D',
      barSizeSetting,
      whatToShow,
      useRTH,
      formatDate,
      Boolean(onUpdateBar),
    );

    return reqId;
  }

  function cancelBarUpdates(reqId: number) {
    api.cancelHistoricalData(reqId);
  }

  function subscribeMarketData(
    contract: Contract,
    onUpdate: ({type, value}: {type: string; value: number}) => void,
  ) {
    const reqId = getNextRequestId();

    addRequestHandler(reqId, {
      [EventName.tickPrice]: (type, value) => {
        onUpdate?.({type, value});
      },
      [EventName.tickSize]: (type, value) => {
        onUpdate?.({type, value});
      },
      /*
      [EventName.tickString]: (type, value) => {
        // onUpdate?.({type, value});
      },
      */
    });

    api.reqMktData(reqId, contract, '', false, false);
    return reqId;
  }

  async function cancelMarketData(reqId: number) {
    api.cancelMktData(reqId);
  }

  async function searchContracts(pattern: string) {
    return new Promise<ContractDescription[]>(resolve => {
      const reqId = getNextRequestId();

      addRequestHandler(reqId, {
        [EventName.symbolSamples]: contractDescriptions => {
          removeRequestHandler(reqId);
          resolve(contractDescriptions);
        },
      });

      api.reqMatchingSymbols(reqId, pattern);
    });
  }

  async function getContractDetails(contract: Contract) {
    return new Promise<ContractDetails[]>(resolve => {
      const reqId = getNextRequestId();
      const contracts: ContractDetails[] = [];

      addRequestHandler(reqId, {
        [EventName.contractDetails]: details => {
          contracts.push(details);
        },
        [EventName.contractDetailsEnd]: () => {
          removeRequestHandler(reqId);
          resolve(contracts);
        },
      });

      api.reqContractDetails(reqId, contract);
    });
  }

  // async function requestOpenOrders() {
  //   type OpenOrder = {
  //     orderId: number;
  //     contract: Contract;
  //     order: Order;
  //     state: OrderState;
  //   };
  //   return new Promise<OpenOrder[]>(resolve => {
  //     const orders: OpenOrder[] = [];

  //     addGlobalHandler('OPEN_ORDERS', {
  //       [EventName.openOrder]: (orderId, contract, order, state) => {
  //         orders.push({
  //           orderId,
  //           contract,
  //           order,
  //           state,
  //         });
  //       },
  //       [EventName.openOrderEnd]: () => {
  //         removeGlobalHandler('OPEN_ORDERS');
  //         resolve(orders);
  //       },
  //     });

  //     api.reqAllOpenOrders();
  //   });
  // }

  function getOpenPositions() {
    return openPositions;
  }

  const placeOrder = ({
    contract,
    order,
    existingOrderId,
    onError,
  }: {
    contract: Contract;
    order: Order;
    existingOrderId?: number;
    onError?: (err: Error, errorCode: ErrorCode) => void;
  }) => {
    const reqId = getNextRequestId();
    const orderId = existingOrderId || getNextOrderId();

    addRequestHandler(reqId, {
      [EventName.error]: (err, code) => onError?.(err, code),
    });

    api.placeOrder(orderId, contract, {
      ...order,
      orderId,
      transmit: typeof order.transmit === 'boolean' ? order.transmit : true,
    });

    return orderId;
  };

  return {
    connect,
    disconnect,
    searchContracts,
    getContractDetails,
    getHistoricalTicksBidAsk,
    getHistoricalTicksLast,
    getHistoricalData,
    getNextOrderId,
    requestBarUpdates,
    cancelBarUpdates,
    subscribeMarketData,
    cancelMarketData,
    // requestOpenOrders,
    getOpenPositions,
    placeOrder,
  };
}

export type IbWrapper = ReturnType<typeof init>;
