import { initialFrame } from './types';
import type { CallNode, Frame } from './types';
export type RecursionId = 'fibonacci' | 'factorial' | 'hanoi';
export function traceRecursion(id: RecursionId, n: number): Frame[] {
  const min = id === 'hanoi' ? 1 : 0;
  const max = id === 'fibonacci' ? 8 : id === 'factorial' ? 10 : 5;
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${id} requires an integer between ${min} and ${max}.`);
  const state = initialFrame();
  if (id === 'hanoi') state.pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
  const frames: Frame[] = [structuredClone(state)];
  let counter = 0;
  const emit = (operation: Frame['operation'], description: string) => { state.operation = operation; state.description = description; frames.push(structuredClone(state)); };
  const visit = (value: number, parentId?: string, depth = 0, from = 0, to = 2, aux = 1): number => {
    const base = value <= 1;
    const node: CallNode = {
      id: `call-${counter++}`, parentId, depth,
      label: id === 'hanoi' ? `hanoi(${value}, ${'ABC'[from]} → ${'ABC'[to]})` : `${id === 'fibonacci' ? 'fib' : 'fact'}(${value})`,
      condition: id === 'hanoi' ? 'n = 1' : 'n ≤ 1', base,
      expression: id === 'hanoi' ? 'Move n−1, move disk n, move n−1' : id === 'fibonacci' ? `fib(${value - 1}) + fib(${value - 2})` : `${value} × fact(${value - 1})`,
      status: 'active',
    };
    state.nodes.push(node); emit('call', `Call ${node.label}. Base condition ${node.condition} is ${base}.`);
    let result = id === 'fibonacci' ? value : 1;
    if (id === 'hanoi') {
      if (!base) { node.status = 'waiting'; visit(value - 1, node.id, depth + 1, from, aux, to); }
      const pegs = state.pegs!;
      pegs[from].pop(); pegs[to].push(value); state.writes++;
      node.status = 'active'; emit('move', `Move disk ${value} from ${'ABC'[from]} to ${'ABC'[to]}.`);
      if (!base) { node.status = 'waiting'; visit(value - 1, node.id, depth + 1, aux, to, from); }
      node.result = 'Complete';
    } else if (!base) {
      node.status = 'waiting';
      const left = visit(value - 1, node.id, depth + 1);
      result = id === 'factorial' ? value * left : left + visit(value - 2, node.id, depth + 1);
    }
    node.status = 'returned'; node.result = id === 'hanoi' ? 'Complete' : result;
    emit('return', `${node.label} returns ${node.result}.`);
    return result;
  };
  const result = visit(n);
  emit('done', id === 'hanoi' ? `Solved in ${state.writes} legal disk moves.` : `Result: ${result}. All calls have returned.`);
  return frames;
}
