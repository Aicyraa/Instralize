import { useState } from 'react';
import type { Algorithm, Frame } from '../algorithms/types';
export function Inspector({
  frame,
  frames,
  index,
  algorithm,
  onSeek,
}: {
  frame: Frame;
  frames: Frame[];
  index: number;
  algorithm?: Algorithm;
  onSeek: (index: number) => void;
}) {
  const tabs = ['Explanation', 'Steps', 'Details'];
  const [tab, setTab] = useState('Explanation');
  return (
    <div className="inspector-content">
      <div className="small-tabs" role="tablist" aria-label="Inspector">
        {tabs.map((name) => (
          <button
            role="tab"
            id={`inspector-${name}`}
            aria-controls="inspector-panel"
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onKeyDown={(event) => {
              const index = tabs.indexOf(name);
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft'
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabs.length - 1
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              setTab(tabs[next]);
              document.getElementById(`inspector-${tabs[next]}`)?.focus();
            }}
            key={name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="inspector-panel"
        aria-labelledby={`inspector-${tab}`}
      >
        {tab === 'Explanation' ? (
          <>
            <span className={`operation ${frame.operation}`}>
              {frame.operation}
            </span>
            <h3 className="step-description">{frame.description}</h3>
            <p className="muted">
              {frame.active.length
                ? `Active indices: ${frame.active.join(', ')}`
                : 'Follow the highlighted values as the algorithm progresses.'}
            </p>
            <div className="metrics">
              <div>
                <strong>{frame.comparisons}</strong>
                <span>Comparisons</span>
              </div>
              <div>
                <strong>{frame.writes}</strong>
                <span>Writes / moves</span>
              </div>
            </div>
            {frame.variables && (
              <>
                <h3>Variables</h3>
                <dl className="variables mono">
                  {Object.entries(frame.variables).map(([name, value]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {frame.stack && (
              <>
                <h3>Call stack</h3>
                <ol className="stack mono">
                  {frame.stack.map((call, i) => (
                    <li key={i}>{call}</li>
                  ))}
                </ol>
              </>
            )}
          </>
        ) : tab === 'Steps' ? (
          <ol className="step-list">
            {frames
              .slice(
                Math.max(0, index - 40),
                Math.min(frames.length, index + 41),
              )
              .map((step, i) => {
                const position = Math.max(0, index - 40) + i;
                return (
                  <li key={position}>
                    <button
                      aria-current={position === index ? 'step' : undefined}
                      onClick={() => onSeek(position)}
                    >
                      <span className="mono muted">
                        {String(position).padStart(3, '0')}
                      </span>
                      <span>{step.description}</span>
                    </button>
                  </li>
                );
              })}
          </ol>
        ) : (
          <>
            <h3>{algorithm?.name ?? 'Your sorting algorithm'}</h3>
            <p>
              {algorithm?.summary ??
                'Supported JavaScript executes in a bounded interpreter. Incorrect attempts remain playable for debugging.'}
            </p>
            <dl className="details-list">
              <dt>Time</dt>
              <dd>{algorithm?.time ?? 'Depends on your code'}</dd>
              <dt>Auxiliary space</dt>
              <dd>{algorithm?.space ?? 'Depends on your code'}</dd>
              <dt>Input</dt>
              <dd>
                {algorithm?.limits ?? 'Numeric arrays; see supported syntax'}
              </dd>
            </dl>
            <p className="muted">
              Complexity describes the algorithm itself. Recording snapshots
              adds visualization overhead.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
