import type { Algorithm } from './types';
import { traceSort } from './sorting';
import type { SortId } from './sorting';
import { traceSearch } from './searching';
import { traceRecursion } from './recursion';
import type { RecursionId } from './recursion';
const sorts: [SortId, string, string, string, string][] = [
  [
    'bubble',
    'Bubble sort',
    'Compare neighbors and move the largest remaining value to the end.',
    'O(n²)',
    'O(1)',
  ],
  [
    'selection',
    'Selection sort',
    'Select the smallest remaining value for each position.',
    'O(n²)',
    'O(1)',
  ],
  [
    'insertion',
    'Insertion sort',
    'Insert each value into the sorted prefix.',
    'O(n²)',
    'O(1)',
  ],
  [
    'merge',
    'Merge sort',
    'Split the array, then merge sorted halves using a buffer.',
    'O(n log n)',
    'O(n)',
  ],
  [
    'quick',
    'Quick sort',
    'Partition around a pivot, then sort each partition.',
    'O(n²) worst',
    'O(n) worst',
  ],
  [
    'heap',
    'Heap sort',
    'Build a max heap and repeatedly extract its largest value.',
    'O(n log n)',
    'O(1)',
  ],
  [
    'shell',
    'Shell sort',
    'Sort distant neighbors using progressively smaller gaps.',
    'O(n²) worst',
    'O(1)',
  ],
  [
    'counting',
    'Counting sort',
    'Count integer occurrences and rebuild the ordered array.',
    'O(n + k)',
    'O(n + k)',
  ],
];
export const algorithms: Algorithm[] = [
  ...sorts.map(([id, name, summary, time, space]) => ({
    id,
    name,
    category: 'Sorting' as const,
    summary,
    time,
    space,
    example: '42, 17, 63, 8, 35, 51, 24, 76, 12, 59',
    limits: '1–64 integers · −999 to 999',
    run: (values: number[]) => traceSort(id, values),
  })),
  ...[false, true].map((binary) => ({
    id: binary ? 'binary' : 'linear',
    name: binary ? 'Binary search' : 'Linear search',
    category: 'Searching' as const,
    summary: binary
      ? 'Halve an ascending search range to find the first match.'
      : 'Inspect values from left to right to find the first match.',
    time: binary ? 'O(log n)' : 'O(n)',
    space: 'O(1)',
    example: '8, 12, 17, 24, 35, 42, 51, 59, 63, 76',
    limits: binary
      ? 'Ascending integers · first matching index'
      : '1–64 integers · first matching index',
    run: (values: number[], target?: number) =>
      traceSearch(binary, values, target),
  })),
  ...(['fibonacci', 'factorial', 'hanoi'] as RecursionId[]).map((id) => ({
    id,
    name:
      id === 'hanoi'
        ? 'Tower of Hanoi'
        : id === 'fibonacci'
          ? 'Fibonacci'
          : 'Factorial',
    category: 'Recursion' as const,
    summary:
      id === 'fibonacci'
        ? 'Expand recursive calls and combine their return values.'
        : id === 'factorial'
          ? 'Multiply n by the result of factorial(n−1), down to the base case.'
          : 'Move a stack between pegs, one disk at a time, without placing a larger disk on a smaller one.',
    time: id === 'factorial' ? 'O(n)' : 'O(2ⁿ)',
    space: 'O(n) stack',
    example: id === 'hanoi' ? '3' : '5',
    limits:
      id === 'hanoi'
        ? '1–5 disks'
        : id === 'fibonacci'
          ? 'Integer 0–8'
          : 'Integer 0–10',
    run: (values: number[]) => traceRecursion(id, values[0]),
  })),
];
