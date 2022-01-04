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
  }, arrays[0]);
}
