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
  };

  const requests: Record<number, Partial<IbEventHandler>> = {};

  api.on(EventName.nextValidId, orderId => {
    nextValidOrderId = orderId;
  });

  api.on(
    EventName.historicalData,
    (reqId, time, open, high, low, close, volume, count, WAP) => {
      requests[reqId]?.[EventName.historicalData]?.({
        time,
        open,
        high,
        low,
        close,
        volume,
        count,
        WAP,
      });
    },
  );

  api.on(
    EventName.historicalDataUpdate,
    (reqId, time, open, high, low, close, volume, count, WAP) => {
      requests[reqId]?.[EventName.historicalDataUpdate]?.({
        time,
        open,
        high,
        low,
        close,
        volume,
        count,
        WAP,
      });
    },
  );

  api.on(EventName.historicalTicksLast, (reqId, ticks, done) => {
    requests[reqId]?.[EventName.historicalTicksLast]?.(ticks, done);
  });

  api.on(EventName.historicalTicksBidAsk, (reqId, ticks, done) => {
    requests[reqId]?.[EventName.historicalTicksBidAsk]?.(ticks, done);
  });

  api.on(EventName.symbolSamples, (reqId, contractDescriptions) => {
    requests[reqId]?.[EventName.symbolSamples]?.(contractDescriptions);
  });

  api.on(EventName.contractDetails, (reqId, contractDetails) => {
    requests[reqId]?.[EventName.contractDetails]?.(contractDetails);
  });

  api.on(EventName.contractDetailsEnd, reqId => {
    requests[reqId]?.[EventName.contractDetailsEnd]?.();
  });

  function addRequestHandler(reqId: number, handlers: Partial<IbEventHandler>) {
    requests[reqId] = handlers;
  }

  function removeRequestHandler(reqId: number) {
    delete requests[reqId];
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
    onUpdateBar?: ((bar: Bar) => void) | null,
  ) {
    return new Promise<Bar[]>(resolve => {
      const reqId = getNextRequestId();
      const bars: Bar[] = [];

      addRequestHandler(reqId, {
        [EventName.historicalData]: bar => {
          if (bar.open === -1) {
            if (!onUpdateBar) {
              removeRequestHandler(reqId);
            }
            resolve(bars);
          } else {
            bars.push(bar);
          }
        },
        [EventName.historicalDataUpdate]: bar => {
          onUpdateBar?.(bar);
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
        Boolean(onUpdateBar),
      );
    });
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

  return {
    connect,
    disconnect,
    searchContracts,
    getContractDetails,
    getHistoricalTicksBidAsk,
    getHistoricalTicksLast,
    getHistoricalData,
    getNextOrderId,
  };
}

export type IbWrapper = ReturnType<typeof init>;
