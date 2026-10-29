import type { Dispatch } from 'react';
import type { Action, Playback } from './model';
export function PlaybackControls({ state, dispatch }: { state: Playback; dispatch: Dispatch<Action> }) {
  const last = Math.max(0, state.frames.length - 1);
  return <section className="playback" aria-label="Playback controls">
    <div className="transport">
      <button aria-label="Replay from start" onClick={() => dispatch({ type: 'seek', index: 0 })} disabled={!last}>↺</button>
      <button aria-label="Previous step" onClick={() => dispatch({ type: 'seek', index: state.index - 1 })} disabled={state.index === 0}>←</button>
      <button className="primary play-button" onClick={() => dispatch({ type: state.playing ? 'pause' : 'play' })} disabled={!last && !state.pending}>{state.playing ? 'Ⅱ Pause' : state.index === last && last ? '↻ Replay' : '▶ Play'}</button>
      <button aria-label="Next step" onClick={() => dispatch({ type: 'seek', index: state.index + 1 })} disabled={state.index >= last}>→</button>
      <label className="speed-label">Speed<select aria-label="Playback speed" value={state.speed} onChange={e => dispatch({ type: 'speed', speed: Number(e.target.value) })}>{[.25, .5, 1, 1.5, 2, 3].map(speed => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
    </div>
    <div className="timeline"><input aria-label="Playback position" type="range" min={0} max={last} value={state.index} disabled={!last} onChange={e => dispatch({ type: 'seek', index: Number(e.target.value) })} /><span className="mono">{state.index} / {last}{state.pending ? ' · tracing' : ''}</span></div>
  </section>;
}
