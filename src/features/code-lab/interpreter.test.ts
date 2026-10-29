import { expect, it } from 'vitest';
import { CodeError, runCode } from './interpreter';
import { examples, checkInputs } from './examples';
import type { Frame } from '../algorithms/types';
for (const example of Object.values(examples))
  it(`${example.name} sorts iterative/recursive inputs`, () => {
    for (const input of checkInputs)
      expect(runCode(example.code, input).correct).toBe(true);
  });
it('records executed lines, variables, stack and resulting writes', () => {
  const frames: Frame[] = [];
  runCode(examples.bubble.code, [3, 1, 2], {
    emit: (frame) => frames.push(frame),
  });
  expect(
    frames.some((f) => f.source?.line === 5 && f.operation === 'write'),
  ).toBe(true);
  expect(frames.some((f) => f.variables?.j === '0')).toBe(true);
  expect(frames.some((f) => f.stack?.length === 1)).toBe(true);
  expect(frames.at(-1)!.items.map((item) => item.value)).toEqual([1, 2, 3]);
  expect(frames[0].items.map((item) => item.value)).toEqual([3, 1, 2]);
});
it('rejects unrelated and prohibited code', () => {
  for (const code of [
    '',
    'console.log(1);',
    'function sort(arr) { return 3; }',
    'function sort(arr) { return [1, 2]; }',
    'function sort(arr) { arr.sort(); }',
    'function sort(arr) { return arr.constructor; }',
    'function sort(arr) { return fetch(1); }',
    'async function sort(arr) { return arr; }',
    'function sort(arr) { const x = {}; return arr; }',
  ])
    expect(() => runCode(code, [2, 1])).toThrow(CodeError);
});
it('keeps incorrect sorting attempts inspectable', () => {
  const frames: Frame[] = [];
  expect(
    runCode('function sort(arr) { let n = arr.length; return arr; }', [2, 1], {
      emit: (frame) => frames.push(frame),
    }).correct,
  ).toBe(false);
  expect(frames.at(-1)!.operation).toBe('done');
});
it('bounds operations, recursion, frames, allocation and source', () => {
  expect(() =>
    runCode('function sort(arr) { while (true) {} }', [1], {
      limits: { operations: 100 },
    }),
  ).toThrow(/budget/);
  expect(() =>
    runCode('function sort(arr) { return sort(arr); }', [1], {
      limits: { depth: 4 },
    }),
  ).toThrow(/stack limit/);
  expect(() =>
    runCode(examples.bubble.code, [3, 2, 1], { limits: { frames: 3 } }),
  ).toThrow(/frame limit/);
  expect(() =>
    runCode('function sort(arr) { while (true) arr.push(1); }', [1], {
      limits: { cells: 8 },
    }),
  ).toThrow(/allocation/);
  expect(() => runCode('x'.repeat(20001), [1])).toThrow(/20KB/);
});
it('reports runtime errors with a source location', () => {
  try {
    runCode('function sort(arr) {\n arr[99] = 1;\n}', [1]);
    throw new Error('Expected failure');
  } catch (cause) {
    expect(cause).toBeInstanceOf(CodeError);
    expect((cause as CodeError).line).toBe(2);
  }
});
it('supports helper scopes, do/while, continue and break', () => {
  expect(
    runCode(
      `function sort(arr) {
    let i = 0;
    do { i++; if (i < 2) continue; break; } while (true);
    const n = arr.length;
    arr[0] += 0;
    return arr;
  }`,
      [1],
    ).correct,
  ).toBe(true);
});
