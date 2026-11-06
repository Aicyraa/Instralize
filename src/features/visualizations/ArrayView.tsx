import { motion, useReducedMotion } from 'motion/react';
import type { Frame } from '../algorithms/types';
export type ElementStyle = 'bars' | 'circles' | 'squares' | 'array';
export function ArrayView({
  frame,
  style = 'array',
  speed = 1,
}: {
  frame: Frame;
  style?: ElementStyle;
  speed?: number;
}) {
  const reduced = useReducedMotion();
  const max = Math.max(1, ...frame.items.map((item) => Math.abs(item.value)));
  const hasNegative = frame.items.some((item) => item.value < 0);
  // Writes can temporarily duplicate an item. Position keys accurately represent writes;
  // permutation-only frames use identities so actual swaps animate across the array.
  const unique =
    new Set(frame.items.map((item) => item.id)).size === frame.items.length;
  return (
    <div className="array-workspace">
      <div
        className="array-stage"
        role="list"
        aria-label="Array values"
        data-style={style}
      >
        {frame.items.map((item, i) => {
          const state =
            frame.found === i || frame.finalized.includes(i)
              ? 'complete'
              : frame.active.includes(i)
                ? frame.operation === 'compare'
                  ? 'compare'
                  : 'active'
                : 'neutral';
          const discarded =
            frame.range && (i < frame.range[0] || i > frame.range[1]);
          const height = Math.max(
            3,
            (Math.abs(item.value) / max) * (hasNegative ? 105 : 200),
          );
          return (
            <motion.div
              layout={reduced ? false : 'position'}
              transition={{
                duration: reduced ? 0 : Math.min(0.42, 0.48 / speed),
                ease: [0.45, 0, 0.2, 1],
              }}
              key={unique ? item.id : `slot-${i}`}
              role="listitem"
              aria-label={`Index ${i}: ${item.value}${frame.active.includes(i) ? ', active' : ''}`}
              className={`array-item ${state}${discarded ? ' discarded' : ''}`}
            >
              {style === 'bars' ? (
                <div className={`bar-slot${hasNegative ? ' signed' : ''}`}>
                  <div
                    className={`bar ${item.value < 0 ? 'negative' : ''}`}
                    style={{
                      height,
                      bottom: hasNegative
                        ? item.value < 0
                          ? 110 - height
                          : 110
                        : 0,
                    }}
                  >
                    <span>{item.value}</span>
                  </div>
                </div>
              ) : (
                <div className={`value-shape ${style}`}>{item.value}</div>
              )}
              <span className="index mono">{i}</span>
            </motion.div>
          );
        })}
      </div>
      {frame.buffer && (
        <div className="buffer">
          <h3>
            {frame.buffer.label}
            {frame.buffer.offset !== undefined
              ? ` · offset ${frame.buffer.offset}`
              : ''}
          </h3>
          <div className="buffer-values mono">
            {frame.buffer.values.map((v, i) => (
              <span key={i} title={`Value ${(frame.buffer!.offset ?? 0) + i}`}>
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
