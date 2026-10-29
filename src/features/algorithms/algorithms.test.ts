import { describe, expect, it } from 'vitest';
import { algorithms } from './registry';
import { parseArray } from './input';
import { traceRecursion } from './recursion';
import { traceSearch } from './searching';

describe('sorting traces', () => {
  for (const algorithm of algorithms.filter((a) => a.category === 'Sorting')) {
    it(`${algorithm.id} sorts without mutating input and emits valid frames`, () => {
      for (const values of [
        [],
        [1],
        [3, 1, 3, -2, 0],
        [1, 2, 3],
        [5, 4, 3, 2, 1],
        [-999, 999, 0],
      ]) {
        const original = [...values];
        const frames = algorithm.run(values);
        expect(frames.at(-1)!.items.map((i) => i.value)).toEqual(
          [...values].sort((a, b) => a - b),
        );
        expect(values).toEqual(original);
        expect(frames[0].items.map((i) => i.value)).toEqual(original);
        for (const frame of frames)
          expect(frame.active.every((i) => i >= 0 && i < values.length)).toBe(
            true,
          );
      }
    });
  }
});
it('validates entire input rather than silently dropping tokens', () => {
  for (const text of [
    '',
    '1,,2',
    '1x,2',
    '1.2',
    '1000',
    Array(66).fill('1').join(','),
  ])
    expect(() => parseArray(text)).toThrow();
  expect(parseArray(' -2, 0, 2 ')).toEqual([-2, 0, 2]);
});
it('finds first duplicates and missing values', () => {
  for (const binary of [false, true]) {
    expect(traceSearch(binary, [1, 2, 2, 3], 2).at(-1)!.found).toBe(1);
    expect(traceSearch(binary, [1, 2], 9).at(-1)!.found).toBe(-1);
  }
  expect(() => traceSearch(true, [2, 1], 1)).toThrow();
});
it('shows only reached calls and returns correct recursive results', () => {
  expect(traceRecursion('factorial', 5).at(-1)!.nodes[0].result).toBe(120);
  expect(traceRecursion('fibonacci', 6).at(-1)!.nodes[0].result).toBe(8);
  expect(traceRecursion('factorial', 0).at(-1)!.nodes[0].result).toBe(1);
  expect(traceRecursion('fibonacci', 4)[1].nodes).toHaveLength(1);
  expect(() => traceRecursion('hanoi', 0)).toThrow();
});
it('Hanoi makes only legal moves', () => {
  const frames = traceRecursion('hanoi', 4);
  expect(frames.at(-1)!.pegs).toEqual([[], [], [4, 3, 2, 1]]);
  expect(frames.filter((f) => f.operation === 'move')).toHaveLength(15);
  for (const frame of frames)
    for (const peg of frame.pegs ?? [])
      expect(peg.every((disk, i) => i === 0 || peg[i - 1] > disk)).toBe(true);
});
