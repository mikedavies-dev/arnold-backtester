type InitStrategy = () => void;
type ExtraSymbols = Array<string>;

export async function loadStrategy(path: string) {
  try {
    const {
      init,
      extraSymbols,
    }: {
      init: InitStrategy;
      extraSymbols: ExtraSymbols;
    } = await import(path);

    return {
      init,
      extraSymbols,
    };
  } catch (err) {
    return null;
  }
}
