import { expect, it } from 'vitest';
import { playbackReducer } from './model';
import { initialFrame } from '../algorithms/types';
import type { Playback } from './model';
const state: Playback = {
  frames: [initialFrame([2, 1]), initialFrame([1, 2])],
  index: 0,
  playing: false,
  speed: 1,
  pending: false,
};
it('plays, pauses, completes and replays deterministically', () => {
  const playing = playbackReducer(state, { type: 'play' });
  expect(playbackReducer(playing, { type: 'play' })).toEqual(playing);
  const done = playbackReducer(playing, { type: 'tick' });
  expect(done.playing).toBe(false);
  expect(playbackReducer(done, { type: 'play' }).index).toBe(0);
  expect(playbackReducer(playing, { type: 'pause' }).playing).toBe(false);
  expect(playbackReducer(playing, { type: 'seek', index: -5 }).index).toBe(0);
  expect(playbackReducer(playing, { type: 'seek', index: 9 }).index).toBe(1);
});
it('load invalidates a run and streaming waits for more frames', () => {
  const loaded = playbackReducer(
    { ...state, playing: true },
    { type: 'load', frames: [initialFrame()], pending: true },
  );
  expect(loaded.playing).toBe(false);
  expect(
    playbackReducer(playbackReducer(loaded, { type: 'play' }), { type: 'tick' })
      .playing,
  ).toBe(true);
  expect(playbackReducer(loaded, { type: 'complete' }).pending).toBe(false);
});
