export function isNumeric(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n); // eslint-disable-line
}
