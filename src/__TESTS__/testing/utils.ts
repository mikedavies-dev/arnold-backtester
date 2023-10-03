export function deepCopy(o: object) {
  return JSON.parse(JSON.stringify(o));
}
