import type { Frame } from '../algorithms/types';
export interface Playback {
  frames: Frame[];
  index: number;
  playing: boolean;
  speed: number;
  pending: boolean;
}
export type Action =
  | { type: 'load'; frames: Frame[]; pending?: boolean }
  | { type: 'append'; frames: Frame[] }
  | { type: 'complete' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'tick' }
  | { type: 'seek'; index: number }
  | { type: 'speed'; speed: number };
export function playbackReducer(state: Playback, action: Action): Playback {
  switch (action.type) {
    case 'load':
      return {
        ...state,
        frames: action.frames,
        index: 0,
        playing: false,
        pending: action.pending ?? false,
      };
    case 'append':
      return { ...state, frames: [...state.frames, ...action.frames] };
    case 'complete':
      return {
        ...state,
        pending: false,
        playing: state.playing && state.index < state.frames.length - 1,
      };
    case 'play':
      return {
        ...state,
        playing: state.frames.length > 1 || state.pending,
        index:
          !state.pending && state.index === state.frames.length - 1
            ? 0
            : state.index,
      };
    case 'pause':
      return { ...state, playing: false };
    case 'seek':
      return {
        ...state,
        playing: false,
        index: Math.max(0, Math.min(state.frames.length - 1, action.index)),
      };
    case 'speed':
      return { ...state, speed: Math.min(3, Math.max(0.25, action.speed)) };
    case 'tick': {
      const index = Math.min(state.frames.length - 1, state.index + 1);
      return {
        ...state,
        index,
        playing: state.pending || index < state.frames.length - 1,
      };
    }
  }
}

export const createPlayback = (frames: Frame[]): Playback => ({
  frames,
  index: 0,
  playing: false,
  speed: 1,
  pending: false,
});

export type PlaybackGroup = Record<string, Playback>;
export type PlaybackGroupAction =
  | { type: 'add'; id: string; frames: Frame[] }
  | { type: 'remove'; id: string }
  | { type: 'to'; id: string; action: Action }
  | { type: 'each'; ids: string[]; action: Action };

/** Independent playback timelines keyed by visualization instance. */
export function playbackGroupReducer(
  state: PlaybackGroup,
  action: PlaybackGroupAction,
): PlaybackGroup {
  switch (action.type) {
    case 'add':
      return { ...state, [action.id]: createPlayback(action.frames) };
    case 'remove': {
      const next = { ...state };
      delete next[action.id];
      return next;
    }
    case 'to':
      return state[action.id]
        ? {
            ...state,
            [action.id]: playbackReducer(state[action.id], action.action),
          }
        : state;
    case 'each': {
      const next = { ...state };
      for (const id of action.ids)
        if (next[id]) next[id] = playbackReducer(next[id], action.action);
      return next;
    }
  }
}
