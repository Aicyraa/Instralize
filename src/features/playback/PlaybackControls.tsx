import type { CSSProperties, Dispatch } from 'react';
import type { Action, Playback } from './model';
import { Icon } from '../../shared/Icon';
export function PlaybackControls({
  state,
  dispatch,
}: {
  state: Playback;
  dispatch: Dispatch<Action>;
}) {
  const last = Math.max(0, state.frames.length - 1);
  const progress = last ? (state.index / last) * 100 : 0;
  return (
    <section className="playback" aria-label="Playback controls">
      <div className="transport">
        <div className="transport-group">
          <button
            className="icon-button"
            aria-label="Replay from start"
            title="Back to start"
            onClick={() => dispatch({ type: 'seek', index: 0 })}
            disabled={!last}
          >
            <Icon name="replay" />
          </button>
          <button
            className="icon-button"
            aria-label="Previous step"
            title="Previous step"
            onClick={() => dispatch({ type: 'seek', index: state.index - 1 })}
            disabled={state.index === 0}
          >
            <Icon name="previous" />
          </button>
          <button
            className="primary play-button"
            onClick={() => dispatch({ type: state.playing ? 'pause' : 'play' })}
            disabled={!last && !state.pending}
          >
            <Icon
              name={
                state.playing
                  ? 'pause'
                  : state.index === last && last
                    ? 'replay'
                    : 'play'
              }
              size={14}
            />
            {state.playing
              ? 'Pause'
              : state.index === last && last
                ? 'Replay'
                : 'Play'}
          </button>
          <button
            className="icon-button"
            aria-label="Next step"
            title="Next step"
            onClick={() => dispatch({ type: 'seek', index: state.index + 1 })}
            disabled={state.index >= last}
          >
            <Icon name="next" />
          </button>
        </div>
        <label className="speed-label">
          Speed
          <select
            aria-label="Playback speed"
            value={state.speed}
            onChange={(e) =>
              dispatch({ type: 'speed', speed: Number(e.target.value) })
            }
          >
            {[0.25, 0.5, 1, 1.5, 2, 3].map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="timeline">
        <input
          aria-label="Playback position"
          type="range"
          min={0}
          max={last}
          value={state.index}
          disabled={!last}
          style={{ '--progress': `${progress}%` } as CSSProperties}
          onChange={(e) =>
            dispatch({ type: 'seek', index: Number(e.target.value) })
          }
        />
        <span className="mono">
          {state.index} / {last}
          {state.pending ? ' · tracing' : ''}
        </span>
      </div>
    </section>
  );
}
