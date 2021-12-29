declare module 'promise-series2' {
  export default function series<ItemType, ReturnType>(
    cb: (item: ItemType) => ReturnType | Promise<ReturnType>,
    parallel: bool | number,
    items: Array<ItemType>,
  ): Promise<Array<ReturnType>>;
}
