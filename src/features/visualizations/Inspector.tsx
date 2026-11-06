import { useEffect, useRef } from 'react';
import type { Frame } from '../algorithms/types';
import { Icon } from '../../shared/Icon';

const LOG_LIMIT = 300;

/** Execution map: a log of the steps that have already run. */
export function Inspector({
  frame,
  frames,
  index,
  onSeek,
}: {
  frame: Frame;
  frames: Frame[];
  index: number;
  onSeek: (index: number) => void;
}) {
  const log = useRef<HTMLOListElement>(null);
  const start = Math.max(1, index - LOG_LIMIT + 1);
  const done = frames.slice(start, index + 1);
  const finished = index > 0 && index === frames.length - 1;

  // Follow the newest finished step, like a console.
  useEffect(() => {
    const el = log.current;
    el?.scrollTo?.({ top: el.scrollHeight, behavior: 'smooth' });
  }, [index]);

  return (
    <div className="exec-map">
      <dl className="exec-stats mono">
        <div>
          <dt>Done</dt>
          <dd>
            {index}
            <span>/{Math.max(0, frames.length - 1)}</span>
          </dd>
        </div>
        <div>
          <dt>Compares</dt>
          <dd>{frame.comparisons}</dd>
        </div>
        <div>
          <dt>Writes</dt>
          <dd>{frame.writes}</dd>
        </div>
      </dl>
      {done.length ? (
        <ol className="exec-log" ref={log} aria-label="Completed steps">
          {done.map((step, i) => {
            const position = start + i;
            return (
              <li key={position}>
                <button
                  aria-current={position === index ? 'step' : undefined}
                  onClick={() => onSeek(position)}
                >
                  <Icon name="check" size={12} />
                  <span className="mono exec-index">
                    {String(position).padStart(3, '0')}
                  </span>
                  <span>{step.description}</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="exec-empty">No steps done yet.</p>
      )}
      {finished && <p className="exec-finished mono">Finished</p>}
      {frame.variables && (
        <dl className="variables mono">
          {Object.entries(frame.variables).map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {frame.stack && (
        <ol className="stack mono" aria-label="Call stack">
          {frame.stack.map((call, i) => (
            <li key={i}>{call}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
