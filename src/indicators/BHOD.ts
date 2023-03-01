export function hodLevel(high: number) {
  const decimal = high % 1;

  if (decimal >= 0.8) {
    return Math.ceil(high);
  }

  if (decimal < 0.2) {
    return Math.floor(high);
  }

  return high;
}
