import { useEffect, useReducer } from 'react';
import { playbackReducer } from './model';
import type { Frame } from '../algorithms/types';
export function usePlayback(frames: Frame[]) {
  const [state, dispatch] = useReducer(playbackReducer, { frames, index: 0, playing: false, speed: 1, pending: false });
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setTimeout(() => dispatch({ type: 'tick' }), 600 / state.speed);
    return () => window.clearTimeout(timer);
  }, [state.playing, state.index, state.speed, state.frames.length, state.pending]);
  return { state, dispatch, frame: state.frames[state.index] };
}
