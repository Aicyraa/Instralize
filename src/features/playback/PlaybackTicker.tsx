import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { Playback, PlaybackGroupAction } from './model';
import { usePlaybackTimer } from './usePlayback';

/** Gives each grouped timeline its own timer so speeds never interfere. */
export function PlaybackTicker({
  id,
  state,
  dispatch,
}: {
  id: string;
  state: Playback;
  dispatch: Dispatch<PlaybackGroupAction>;
}) {
  const tick = useCallback(
    () => dispatch({ type: 'to', id, action: { type: 'tick' } }),
    [dispatch, id],
  );
  usePlaybackTimer(state, tick);
  return null;
}
