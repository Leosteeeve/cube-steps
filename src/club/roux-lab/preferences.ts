import { ROUX_FRAMES, selectRouxFrames } from '../../methods/roux-advanced/frames';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
export function createRouxLabPreferences(
  storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage,
) {
  const defaults = () => ROUX_FRAMES.map((f) => f.id),
    key = 'cubesteps.club.roux-lab.preferences.v1';
  return {
    load(): { frames: readonly RouxFrameId[]; status: 'ready' | 'corrupt' | 'unavailable' } {
      let text;
      try {
        text = storage().getItem(key);
      } catch {
        return { frames: defaults(), status: 'unavailable' };
      }
      if (text === null) return { frames: defaults(), status: 'ready' };
      try {
        const v = JSON.parse(text);
        if (v.version !== 1 || !Array.isArray(v.frames)) throw Error();
        return { frames: selectRouxFrames(v.frames).map((f) => f.id), status: 'ready' };
      } catch {
        return { frames: defaults(), status: 'corrupt' };
      }
    },
    save(frames: readonly RouxFrameId[]): boolean {
      try {
        const valid = selectRouxFrames(frames);
        storage().setItem(key, JSON.stringify({ version: 1, frames: valid.map((f) => f.id) }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
