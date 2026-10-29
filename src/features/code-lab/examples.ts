export const examples = {
  bubble: {
    name: 'Bubble sort',
    code: `function sort(arr) {
  for (let end = arr.length - 1; end > 0; end--) {
    for (let j = 0; j < end; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`,
  },
  merge: {
    name: 'Recursive merge sort',
    code: `function sort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = sort(arr.slice(0, mid));
  const right = sort(arr.slice(mid));
  const result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  while (i < left.length) result.push(left[i++]);
  while (j < right.length) result.push(right[j++]);
  return result;
}`,
  },
  quick: {
    name: 'Recursive quicksort',
    code: `function partition(arr, lo, hi) {
  const pivot = arr[hi];
  let p = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      [arr[j], arr[p]] = [arr[p], arr[j]];
      p++;
    }
  }
  [arr[p], arr[hi]] = [arr[hi], arr[p]];
  return p;
}
function quick(arr, lo, hi) {
  if (lo >= hi) return;
  const pivot = partition(arr, lo, hi);
  quick(arr, lo, pivot - 1);
  quick(arr, pivot + 1, hi);
}
function sort(arr) {
  quick(arr, 0, arr.length - 1);
  return arr;
}`,
  },
};
export const checkInputs = [
  [],
  [1],
  [3, 1, 2],
  [2, 2, 1, -3, 0],
  [1, 2, 3, 4],
  [5, 4, 3, 2, 1],
  [-999, 0, 999],
];
