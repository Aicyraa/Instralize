import { initialFrame } from './types';
import type { Frame } from './types';
export function traceSearch(
  binary: boolean,
  values: number[],
  target = 0,
): Frame[] {
  if (binary && values.some((value, i) => i > 0 && value < values[i - 1]))
    throw new Error(
      'Binary search requires ascending input. Use “Sort input” first.',
    );
  const state = initialFrame(values);
  const frames = [structuredClone(state)];
  const emit = (description: string) => {
    state.description = description;
    frames.push(structuredClone(state));
  };
  let found = -1;
  if (binary) {
    let lo = 0,
      hi = values.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      state.operation = 'compare';
      state.active = [mid];
      state.range = [lo, hi];
      state.comparisons++;
      emit(
        `Inspect index ${mid}: compare ${values[mid]} with target ${target}.`,
      );
      if (values[mid] >= target) {
        if (values[mid] === target) found = mid;
        hi = mid - 1;
      } else lo = mid + 1;
    }
  } else {
    for (let i = 0; i < values.length; i++) {
      state.operation = 'compare';
      state.active = [i];
      state.range = [i, values.length - 1];
      state.comparisons++;
      emit(`Inspect index ${i}: compare ${values[i]} with target ${target}.`);
      if (values[i] === target) {
        found = i;
        break;
      }
    }
  }
  state.operation = 'done';
  state.found = found;
  state.active = found < 0 ? [] : [found];
  delete state.range;
  emit(
    found < 0
      ? `Target ${target} was not found.`
      : `First occurrence of ${target} is at index ${found}.`,
  );
  return frames;
}
