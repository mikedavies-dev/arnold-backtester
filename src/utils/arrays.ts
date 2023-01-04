export function last<T>(elements: Array<T>, def: T): T {
  return elements.at(-1) || def;
}
