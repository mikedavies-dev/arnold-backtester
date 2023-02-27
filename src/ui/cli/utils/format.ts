import numeral from 'numeral';
import colors from 'colors/safe';

export function colorize(val: number) {
  if (val === 0) {
    return colors.white;
  }

  return val > 0 ? colors.green : colors.red;
}

export function decimal(val: number) {
  return numeral(val).format('0.00');
}

export function thousands(val: number) {
  return numeral(val).format('0.0a');
}

export function percent(val: number) {
  return numeral(val).format('0.00%');
}
