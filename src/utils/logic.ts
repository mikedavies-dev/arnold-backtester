export const incIf = (increment: boolean, base: number, amount = 1) =>
  increment ? base + amount : base;

export const ratio = (num1: number, num2: number) => (num2 ? num1 / num2 : 0);
