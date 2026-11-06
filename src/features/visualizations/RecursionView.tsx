import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CallNode, Frame } from '../algorithms/types';
import { Icon } from '../../shared/Icon';

const NODE_W = 124;
const NODE_H = 40;
const COL = 140;
const ROW = 96;
const PAD = 24;
const spring = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const;

function layoutTree(nodes: CallNode[]) {
  const children = new Map<string, CallNode[]>();
  for (const node of nodes)
    if (node.parentId)
      children.set(node.parentId, [
        ...(children.get(node.parentId) ?? []),
        node,
      ]);
  const positions = new Map<string, { x: number; y: number }>();
  let column = 0;
  // Leaves take the next column; parents sit centered over their children.
  const visit = (node: CallNode): number => {
    const xs = (children.get(node.id) ?? []).map(visit);
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : column++ * COL;
    positions.set(node.id, { x: x + PAD, y: node.depth * ROW + PAD });
    return x;
  };
  for (const root of nodes.filter((node) => !node.parentId)) visit(root);
  const depth = Math.max(0, ...nodes.map((n) => n.depth));
  return {
    positions,
    width: Math.max(COL, column * COL) - (COL - NODE_W) + PAD * 2,
    height: (depth + 1) * ROW - (ROW - NODE_H) + PAD * 2 + 18,
  };
}

const branch = (
  p: { x: number; y: number },
  c: { x: number; y: number },
) => {
  const x1 = p.x + NODE_W / 2;
  const y1 = p.y + NODE_H;
  const x2 = c.x + NODE_W / 2;
  const y2 = c.y;
  const mid = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`;
};

const resultText = (result: CallNode['result']) =>
  typeof result === 'number' ? String(result) : undefined;

export function RecursionView({
  frame,
  previous,
}: {
  frame: Frame;
  /** The prior frame, used to animate values returning to their caller. */
  previous?: Frame;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const { positions, width, height } = layoutTree(frame.nodes);
  const detail = frame.nodes.find((node) => node.id === selected);
  const returnedBefore = new Set(
    previous?.nodes.filter((n) => n.status === 'returned').map((n) => n.id),
  );
  const justReturned = previous
    ? frame.nodes.filter(
        (n) => n.status === 'returned' && n.parentId && !returnedBefore.has(n.id),
      )
    : [];
  const motionTransition = reduced ? { duration: 0 } : spring;

  return (
    <section className="recursion-workspace" aria-label="Recursive calls">
      {frame.pegs && (
        <div className="pegs" aria-label="Tower of Hanoi pegs">
          {frame.pegs.map((peg, i) => (
            <div className="peg" key={i}>
              <div className="disks">
                {[...peg].reverse().map((disk) => (
                  <motion.div
                    layout={!reduced}
                    transition={motionTransition}
                    className="disk mono"
                    key={disk}
                    style={{ width: 24 + disk * 18 }}
                  >
                    {disk}
                  </motion.div>
                ))}
              </div>
              <strong>{'ABC'[i]}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="tree-frame">
        <div className="tree" style={{ width, height }}>
          <svg
            aria-hidden="true"
            width={width}
            height={height}
            className="tree-edges"
          >
            {frame.nodes
              .filter((n) => n.parentId)
              .map((node) => {
                const p = positions.get(node.parentId!)!;
                const c = positions.get(node.id)!;
                return (
                  <motion.path
                    key={node.id}
                    initial={{ d: branch(p, p), opacity: 0 }}
                    animate={{ d: branch(p, c), opacity: 1 }}
                    transition={motionTransition}
                    className={node.status === 'returned' ? 'returned' : ''}
                  />
                );
              })}
          </svg>
          {frame.nodes.map((node) => {
            const position = positions.get(node.id)!;
            const parent = node.parentId
              ? positions.get(node.parentId)
              : undefined;
            const value = resultText(node.result);
            const done = node.result !== undefined;
            return (
              <motion.button
                key={node.id}
                initial={{
                  x: (parent ?? position).x,
                  y: (parent ?? position).y,
                  opacity: 0,
                  scale: 0.7,
                }}
                animate={{ x: position.x, y: position.y, opacity: 1, scale: 1 }}
                transition={motionTransition}
                className={`call-node ${node.status}${node.base ? ' base' : ''}${selected === node.id ? ' selected' : ''}`}
                onClick={() =>
                  setSelected((id) => (id === node.id ? null : node.id))
                }
                aria-pressed={selected === node.id}
                aria-label={`${node.label}, ${node.status}${done ? `, returns ${node.result}` : ''}`}
              >
                <span className="call-label mono">{node.label}</span>
                <AnimatePresence>
                  {done && (
                    <motion.span
                      key="result"
                      className="call-result mono"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 520, damping: 20 }
                      }
                    >
                      {value ?? <Icon name="check" size={12} />}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
          {!reduced &&
            justReturned.map((node) => {
              const from = positions.get(node.id)!;
              const to = positions.get(node.parentId!)!;
              return (
                <motion.span
                  key={`${node.id}-flight`}
                  className="result-flight mono"
                  aria-hidden="true"
                  initial={{
                    x: from.x + NODE_W - 14,
                    y: from.y - 12,
                    scale: 1,
                    opacity: 1,
                  }}
                  animate={{
                    x: to.x + NODE_W / 2 - 13,
                    y: to.y + NODE_H - 13,
                    scale: [1, 1.15, 0.6],
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: 0.6, ease: [0.45, 0, 0.2, 1] }}
                >
                  {resultText(node.result) ?? <Icon name="check" size={12} />}
                </motion.span>
              );
            })}
        </div>
      </div>
      {!frame.nodes.length && (
        <p className="empty-hint">Press Play to start the first call.</p>
      )}
      {detail && (
        <div className="node-detail mono">
          <strong>{detail.label}</strong>
          <span>
            depth {detail.depth} · {detail.condition} → {String(detail.base)}
          </span>
          <span>{detail.base ? 'base case' : detail.expression}</span>
          {detail.result !== undefined && <span>= {detail.result}</span>}
        </div>
      )}
    </section>
  );
}
