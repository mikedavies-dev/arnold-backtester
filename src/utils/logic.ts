export const incIf = (increment: boolean, base: number, amount = 1) =>
  increment ? base + amount : base;

export const ratio = (num1: number, num2: number) => (num2 ? num1 / num2 : 0);

// TODO replace with structuredClone
// https://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript

export function initArrayOfSize(
  size: number,
  fillWith: any,
): Array<typeof fillWith> {
  return typeof fillWith === 'object'
    ? Array(size)
        .fill(0)
        .map(() => JSON.parse(JSON.stringify(fillWith)))
    : Array(size).fill(fillWith);
}
