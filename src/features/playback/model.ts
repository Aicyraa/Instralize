import type { Frame } from '../algorithms/types';
export interface Playback { frames: Frame[]; index: number; playing: boolean; speed: number; pending: boolean }
export type Action = { type: 'load'; frames: Frame[]; pending?: boolean } | { type: 'append'; frames: Frame[] } | { type: 'complete' } | { type: 'play' } | { type: 'pause' } | { type: 'tick' } | { type: 'seek'; index: number } | { type: 'speed'; speed: number };
export function playbackReducer(state: Playback, action: Action): Playback {
  switch (action.type) {
    case 'load': return { ...state, frames: action.frames, index: 0, playing: false, pending: action.pending ?? false };
    case 'append': return { ...state, frames: [...state.frames, ...action.frames] };
    case 'complete': return { ...state, pending: false, playing: state.playing && state.index < state.frames.length - 1 };
    case 'play': return { ...state, playing: state.frames.length > 1 || state.pending, index: !state.pending && state.index === state.frames.length - 1 ? 0 : state.index };
    case 'pause': return { ...state, playing: false };
    case 'seek': return { ...state, playing: false, index: Math.max(0, Math.min(state.frames.length - 1, action.index)) };
    case 'speed': return { ...state, speed: Math.min(3, Math.max(.25, action.speed)) };
    case 'tick': {
      const index = Math.min(state.frames.length - 1, state.index + 1);
      return { ...state, index, playing: state.pending || index < state.frames.length - 1 };
    }
  }
}
