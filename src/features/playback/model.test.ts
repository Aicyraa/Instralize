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
it('keeps grouped timelines independent', async () => {
  const { playbackGroupReducer, createPlayback } = await import('./model');
  const frames = [initialFrame([2, 1]), initialFrame([1, 2])];
  let group = playbackGroupReducer({}, { type: 'add', id: 'a', frames });
  group = playbackGroupReducer(group, { type: 'add', id: 'b', frames });
  group = playbackGroupReducer(group, {
    type: 'to',
    id: 'a',
    action: { type: 'seek', index: 1 },
  });
  expect(group.a.index).toBe(1);
  expect(group.b).toEqual(createPlayback(frames));
  group = playbackGroupReducer(group, {
    type: 'each',
    ids: ['a', 'b', 'missing'],
    action: { type: 'speed', speed: 2 },
  });
  expect([group.a.speed, group.b.speed]).toEqual([2, 2]);
  expect('missing' in group).toBe(false);
  group = playbackGroupReducer(group, { type: 'remove', id: 'a' });
  expect(Object.keys(group)).toEqual(['b']);
});
