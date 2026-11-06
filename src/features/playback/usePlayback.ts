import { useCallback, useEffect, useReducer } from 'react';
import { createPlayback, playbackReducer } from './model';
import type { Playback } from './model';
import type { Frame } from '../algorithms/types';
/** Advances one playing timeline; `tick` must be stable. */
export function usePlaybackTimer(state: Playback, tick: () => void) {
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setTimeout(tick, 600 / state.speed);
    return () => window.clearTimeout(timer);
  }, [
    state.playing,
    state.index,
    state.speed,
    state.frames.length,
    state.pending,
    tick,
  ]);
}
export function usePlayback(frames: Frame[]) {
  const [state, dispatch] = useReducer(
    playbackReducer,
    frames,
    createPlayback,
  );
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  usePlaybackTimer(state, tick);
  return { state, dispatch, frame: state.frames[state.index] };
}
