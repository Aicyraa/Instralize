import { initialFrame } from './types';
import type { Frame, Item } from './types';

export type SortId =
  | 'bubble'
  | 'selection'
  | 'insertion'
  | 'merge'
  | 'quick'
  | 'heap'
  | 'shell'
  | 'counting';
export function traceSort(id: SortId, values: number[]): Frame[] {
  const state = initialFrame(values);
  const a = state.items;
  const frames: Frame[] = [structuredClone(state)];
  const emit = (
    operation: Frame['operation'],
    active: number[],
    description: string,
  ) => {
    state.operation = operation;
    state.active = active;
    state.description = description;
    frames.push(structuredClone(state));
  };
  const compare = (i: number, j: number) => {
    state.comparisons++;
    emit(
      'compare',
      [i, j],
      `Compare ${a[i].value} at index ${i} with ${a[j].value} at index ${j}.`,
    );
    return a[i].value - a[j].value;
  };
  const swap = (i: number, j: number) => {
    if (i === j) return;
    [a[i], a[j]] = [a[j], a[i]];
    state.writes += 2;
    emit('swap', [i, j], `Swap positions ${i} and ${j}.`);
  };
  const write = (i: number, item: Item) => {
    a[i] = { ...item };
    state.writes++;
    emit('write', [i], `Write ${item.value} at index ${i}.`);
  };
  const n = a.length;
  switch (id) {
    case 'bubble':
      for (let end = n - 1; end > 0; end--) {
        let changed = false;
        for (let i = 0; i < end; i++)
          if (compare(i, i + 1) > 0) {
            swap(i, i + 1);
            changed = true;
          }
        state.finalized.push(end);
        if (!changed) break;
      }
      break;
    case 'selection':
      for (let i = 0; i < n - 1; i++) {
        let min = i;
        for (let j = i + 1; j < n; j++) if (compare(j, min) < 0) min = j;
        swap(i, min);
        state.finalized.push(i);
      }
      break;
    case 'insertion':
    case 'shell': {
      for (
        let gap = id === 'shell' ? Math.floor(n / 2) : 1;
        gap > 0;
        gap = id === 'shell' ? Math.floor(gap / 2) : 0
      ) {
        for (let i = gap; i < n; i++) {
          let j = i;
          while (j >= gap && compare(j - gap, j) > 0) {
            swap(j - gap, j);
            j -= gap;
          }
        }
      }
      break;
    }
    case 'merge': {
      const merge = (lo: number, hi: number) => {
        if (hi - lo < 2) return;
        const mid = Math.floor((lo + hi) / 2);
        state.range = [lo, hi - 1];
        emit('range', [], `Split indices ${lo}–${hi - 1} at ${mid}.`);
        merge(lo, mid);
        merge(mid, hi);
        const left = a.slice(lo, mid),
          right = a.slice(mid, hi);
        state.buffer = {
          label: 'Merge buffer',
          values: [...left, ...right].map((item) => item.value),
        };
        let l = 0,
          r = 0;
        for (let k = lo; k < hi; k++) {
          if (l < left.length && r < right.length) {
            state.comparisons++;
            emit(
              'compare',
              [lo + l, mid + r],
              `Compare buffered values ${left[l].value} and ${right[r].value}.`,
            );
          }
          const next =
            r >= right.length ||
            (l < left.length && left[l].value <= right[r].value)
              ? left[l++]
              : right[r++];
          write(k, next);
        }
      };
      merge(0, n);
      delete state.buffer;
      delete state.range;
      break;
    }
    case 'quick': {
      const quick = (lo: number, hi: number) => {
        if (lo >= hi) return;
        state.range = [lo, hi];
        emit('range', [hi], `Choose pivot ${a[hi].value} at index ${hi}.`);
        let p = lo;
        for (let j = lo; j < hi; j++) if (compare(j, hi) < 0) swap(j, p++);
        swap(p, hi);
        state.finalized.push(p);
        quick(lo, p - 1);
        quick(p + 1, hi);
      };
      quick(0, n - 1);
      delete state.range;
      break;
    }
    case 'heap': {
      const sift = (root: number, end: number) => {
        while (root * 2 + 1 < end) {
          let child = root * 2 + 1;
          if (child + 1 < end && compare(child, child + 1) < 0) child++;
          if (compare(root, child) >= 0) break;
          swap(root, child);
          root = child;
        }
      };
      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) sift(i, n);
      for (let end = n - 1; end > 0; end--) {
        swap(0, end);
        state.finalized.push(end);
        sift(0, end);
      }
      break;
    }
    case 'counting': {
      if (!n) break;
      const min = Math.min(...values),
        max = Math.max(...values);
      if (max - min > 1998)
        throw new Error('Counting-sort range is too large.');
      const buckets: Item[][] = Array.from({ length: max - min + 1 }, () => []);
      const counts = Array.from({ length: buckets.length }, () => 0);
      state.buffer = {
        label: 'Counts (index + offset)',
        values: counts,
        offset: min,
      };
      a.forEach((item, i) => {
        buckets[item.value - min].push(item);
        counts[item.value - min]++;
        emit(
          'write',
          [i],
          `Count ${item.value}: ${counts[item.value - min]} occurrence(s).`,
        );
      });
      let k = 0;
      for (const bucket of buckets) for (const item of bucket) write(k++, item);
      break;
    }
  }
  state.finalized = a.map((_, i) => i);
  emit(
    'done',
    [],
    'Sorted in ascending order. Every value is in its final position.',
  );
  return frames;
}
