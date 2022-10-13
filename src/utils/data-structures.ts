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

export function mergeAndDistributeArrays<T>(array1: T[], array2: T[]) {
  // Find the long/short arrays based on length
  const [long, short] =
    array1.length >= array2.length ? [array1, array2] : [array2, array1];

  // Calculate the interval
  const interval = long.length / (short.length + 1);

  // Copy the long array so we don't mutate the input arrays
  const merged = [...long];

  // Iterate the short array and insert the values into the long array
  short.forEach((value, index) => {
    // Calculate the insert index based on the interval and the current index
    const insertAt = Math.ceil(interval * (index + 1));

    // Insert the value
    merged.splice(insertAt + index, 0, value);
  });

  return merged;
}
