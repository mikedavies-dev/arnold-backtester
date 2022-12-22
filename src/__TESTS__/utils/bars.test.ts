import {getRetraceFromHigh, getHigh} from '../../utils/bars';

function testBar(value: number) {
  return {
    time: '00:00:00',
    open: value,
    high: value,
    low: value,
    close: value,
    volume: 0,
  };
}

describe('bar utilities', () => {
  test('get high from a series of bars', () => {
    expect(
      getHigh([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(testBar)),
    ).toBe(13);

    expect(
      getHigh([13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(testBar)),
    ).toBe(13);

    expect(
      getHigh([7, 8, 9, 10, 11, 12, 13, 13, 12, 11, 10, 9, 8, 7].map(testBar)),
    ).toBe(13);
  });

  test('retrace from high 1', () => {
    const bars = [1, 1, 2, 3, 4, 5, 6, 5, 4, 3, 4, 5, 6, 7, 5].map(testBar);

    const high = getHigh(bars);
    expect(high).toBe(7);

    expect(getRetraceFromHigh(bars, high)).toBe(2);
  });

  test('retrace from high 2', () => {
    const bars = [1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 1, 1, 1, 1].map(testBar);

    const high = getHigh(bars);
    expect(high).toBe(10);

    expect(getRetraceFromHigh(bars, high)).toBe(9);
  });

  test('retrace from high 3', () => {
    const bars = [1, 1, 1, 1, 1, 20, 1, 1, 1, 10, 1, 1, 1, 1].map(testBar);

    const high = getHigh(bars);
    expect(high).toBe(20);

    expect(getRetraceFromHigh(bars, high)).toBe(19);
  });

  test('retrace from high 4', () => {
    const bars = [1, 1, 1, 1, 1, 20, 1, 1, 1, 10, 1, 1, 1, 1].map(testBar);

    // if the high is not in our bar list then return the max retrace from the list
    const high = 200;

    expect(getRetraceFromHigh(bars, high)).toBe(199);
  });

  test('retrace from high with empty bars', () => {
    const bars = [].map(testBar);

    const high = getHigh(bars);
    expect(high).toBe(0);

    expect(getRetraceFromHigh(bars, high)).toBe(0);
  });
});
