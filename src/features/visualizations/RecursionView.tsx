import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { CallNode, Frame } from '../algorithms/types';
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
  const visit = (node: CallNode): number => {
    const descendants = children.get(node.id) ?? [];
    const xs = descendants.map(visit);
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : column++ * 224;
    positions.set(node.id, { x, y: node.depth * 154 });
    return x;
  };
  for (const root of nodes.filter((node) => !node.parentId)) visit(root);
  return {
    positions,
    width: Math.max(224, column * 224),
    height: (Math.max(0, ...nodes.map((n) => n.depth)) + 1) * 154,
  };
}
export function RecursionView({ frame }: { frame: Frame }) {
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const { positions, width, height } = layoutTree(frame.nodes);
  const detail = frame.nodes.find((node) => node.id === selected);
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
      <div className="tree-toolbar">
        <h3>
          Call tree{' '}
          <span className="muted">· {frame.nodes.length} calls reached</span>
        </h3>
        <button
          onClick={() => setZoom(Math.max(0.2, Math.min(1, 650 / width)))}
        >
          Fit
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
        >
          −
        </button>
        <span className="mono">{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
        >
          +
        </button>
        <button onClick={() => setZoom(1)}>Reset</button>
      </div>
      <div className="tree-scroll">
        <div
          style={{
            width: width * zoom,
            height: height * zoom,
            minWidth: '100%',
          }}
        >
          <div
            className="tree"
            style={{
              width,
              height,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <svg
              aria-hidden="true"
              width={width}
              height={height}
              className="tree-edges"
            >
              {frame.nodes
                .filter((n) => n.parentId)
                .map((node) => {
                  const p = positions.get(node.parentId!)!,
                    c = positions.get(node.id)!;
                  return (
                    <path
                      key={node.id}
                      d={`M${p.x + 100},${p.y + 126} C${p.x + 100},${p.y + 146} ${c.x + 100},${c.y - 20} ${c.x + 100},${c.y}`}
                      className={node.status === 'returned' ? 'returned' : ''}
                    />
                  );
                })}
            </svg>
            {frame.nodes.map((node) => {
              const position = positions.get(node.id)!;
              return (
                <motion.button
                  key={node.id}
                  layout={!reduced}
                  initial={false}
                  animate={{ left: position.x, top: position.y }}
                  className={`call-node ${node.status}${selected === node.id ? ' selected' : ''}`}
                  onClick={() => setSelected(node.id)}
                  aria-pressed={selected === node.id}
                >
                  <strong className="mono">{node.label}</strong>
                  <span className="node-status">{node.status}</span>
                  <span>
                    Base: {node.condition} → {String(node.base)}
                  </span>
                  <span className="node-expression">
                    {node.base ? 'Base case reached' : node.expression}
                  </span>
                  <span className="mono">
                    {node.result !== undefined
                      ? `↳ ${node.result}`
                      : node.status === 'waiting'
                        ? 'Waiting for child calls'
                        : 'Evaluating…'}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
      {!frame.nodes.length && (
        <p className="empty-hint">
          Press Play to follow each call, its base condition, and its returned
          result.
        </p>
      )}
      {detail && (
        <div className="node-detail">
          <strong>{detail.label}</strong>
          <span>
            Depth {detail.depth} · {detail.status} ·{' '}
            {detail.base ? 'Base case' : detail.expression}
            {detail.result !== undefined ? ` · returns ${detail.result}` : ''}
          </span>
          <button onClick={() => setSelected(null)}>Dismiss</button>
        </div>
      )}
    </section>
  );
}
