import {parseISO} from 'date-fns';

export function mergeSortedArrays<Type>(
  arrays: Array<Array<Type>>,
  sortFn: (v1: Type, v2: Type) => number,
) {
  return arrays.reduce(function mergeArray(arrayA, arrayB, index) {
    // For the first iteration return the first array
    if (index === 0) {
      return arrayA;
    }

    const sorted = [];
    let indexA = 0;
    let indexB = 0;

    while (indexA < arrayA.length && indexB < arrayB.length) {
      if (sortFn(arrayA[indexA], arrayB[indexB]) > 0) {
        sorted.push(arrayB[indexB]);
        indexB += 1;
      } else {
        sorted.push(arrayA[indexA]);
        indexA += 1;
      }
    }

    // Add any remaining entries from the end
    if (indexB < arrayB.length) {
      return sorted.concat(arrayB.slice(indexB));
    }

    return sorted.concat(arrayA.slice(indexA));

    // test
  }, arrays[0]);
}

export function deepParseDates(body: any) {
  if (body === null || body === undefined || typeof body !== 'object') {
    return;
  }

  for (const key of Object.keys(body)) {
    const value = body[key];
    if (value && typeof value === 'string') {
      const dateValue = parseISO(value);
      if (!isNaN(dateValue.getTime())) {
        body[key] = dateValue;
      }
    } else if (typeof value === 'object') {
      deepParseDates(value);
    }
  }
}

export function deDuplicateObjectArray<ObjectType>(
  data: ObjectType[],
  getKey: (value: ObjectType) => string,
) {
  const barDates: Set<string> = new Set();
  return data.filter(value => {
    const key = getKey(value);
    if (barDates.has(key)) {
      return false;
    }
    barDates.add(key);
    return true;
  });
}

/*
Take two arrays and merge them together by evenly distributing the values
from the shorter array into the larger array, i.e.

Merge: [a, b, c] and [1, 2, 3, 4, 5, 6] into [1, 2, a, 3, 4, b, 5, 6, c]

1. Find the longest and shortest arrays
1. Calculate the interval that the values should be distributed at
3. Create a duplicate of the long array so we don't mutate input data
4. Iterate the short array and insert the values into the long array based on the interval
*/

export function mergeAndDistributeArrays<T>(array1: T[], array2: T[]) {
  const [long, short] =
    array1.length >= array2.length ? [array1, array2] : [array2, array1];

  const interval = long.length / (short.length + 1);

  const merged = [...long];

  short.forEach((value, index) => {
    const insertAt = Math.ceil(interval * (index + 1));
    merged.splice(insertAt + index, 0, value);
  });

  return merged;
}
