export type Category = 'Sorting' | 'Searching' | 'Recursion';
export type Operation =
  | 'ready'
  | 'compare'
  | 'swap'
  | 'write'
  | 'range'
  | 'call'
  | 'return'
  | 'move'
  | 'execute'
  | 'done';
export interface Item {
  id: string;
  value: number;
}
export interface CallNode {
  id: string;
  parentId?: string;
  label: string;
  depth: number;
  condition: string;
  base: boolean;
  expression: string;
  status: 'active' | 'waiting' | 'returned';
  result?: number | string;
}
export interface Frame {
  operation: Operation;
  description: string;
  items: Item[];
  active: number[];
  finalized: number[];
  comparisons: number;
  writes: number;
  nodes: CallNode[];
  pegs?: number[][];
  range?: [number, number];
  found?: number;
  buffer?: { label: string; values: number[]; offset?: number };
  source?: { line: number; column: number };
  variables?: Record<string, string>;
  stack?: string[];
}
export interface Algorithm {
  id: string;
  name: string;
  category: Category;
  summary: string;
  time: string;
  space: string;
  example: string;
  limits: string;
  run: (values: number[], target?: number) => Frame[];
}
export function initialFrame(values: number[] = []): Frame {
  return {
    operation: 'ready',
    description: 'Ready. Press Play or step through the algorithm.',
    items: values.map((value, i) => ({ id: `item-${i}`, value })),
    active: [],
    finalized: [],
    comparisons: 0,
    writes: 0,
    nodes: [],
  };
}
