import type { IconName } from '../shared/Icon';

export type NodeKind = 'algorithm' | 'input' | 'visualization' | 'inspector';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  /** Per-kind instance number used in titles. */
  n: number;
  /** Upstream node feeding this instance. */
  source: string | null;
}

export const nodeKinds: Record<
  NodeKind,
  {
    title: string;
    icon: IconName;
    width: number;
    parent: NodeKind | null;
  }
> = {
  algorithm: {
    title: 'Algorithms',
    icon: 'algorithms',
    width: 290,
    parent: null,
  },
  input: {
    title: 'Input',
    icon: 'input',
    width: 320,
    parent: 'algorithm',
  },
  visualization: {
    title: 'Visualization',
    icon: 'visualization',
    width: 760,
    parent: 'input',
  },
  inspector: {
    title: 'Execution map',
    icon: 'map',
    width: 340,
    parent: 'visualization',
  },
};

export const instanceTitle = (kind: NodeKind, n: number) =>
  n > 1 ? `${nodeKinds[kind].title} ${n}` : nodeKinds[kind].title;

export const nextInstance = (nodes: { kind: string; n: number }[], kind: string) =>
  Math.max(0, ...nodes.filter((node) => node.kind === kind).map((node) => node.n)) + 1;
