import { CMLL_CASE_IDS } from '../../methods/roux-advanced/cmll/ids';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
export interface CmllPracticeSelection {
  version: 1;
  caseIds: readonly string[];
  frameId: RouxFrameId;
}
const key = 'cubesteps.club.cmll-practice.v1';
const defaults = (): CmllPracticeSelection => ({
  version: 1,
  caseIds: [...CMLL_CASE_IDS],
  frameId: 'white-blue',
});
function valid(raw: unknown): raw is CmllPracticeSelection {
  if (!raw || typeof raw !== 'object') return false;
  const value = raw as CmllPracticeSelection;
  return (
    value.version === 1 &&
    Array.isArray(value.caseIds) &&
    value.caseIds.length <= 42 &&
    new Set(value.caseIds).size === value.caseIds.length &&
    value.caseIds.every((id) => CMLL_CASE_IDS.includes(id)) &&
    ROUX_FRAMES.some((f) => f.id === value.frameId)
  );
}
export function createCmllPracticeStore(
  storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage,
) {
  return {
    load(): { selection: CmllPracticeSelection; status: 'ready' | 'corrupt' | 'unavailable' } {
      let text: string | null;
      try {
        text = storage().getItem(key);
      } catch {
        return { selection: defaults(), status: 'unavailable' };
      }
      if (text === null) return { selection: defaults(), status: 'ready' };
      try {
        const raw: unknown = JSON.parse(text);
        if (valid(raw)) return { selection: raw, status: 'ready' };
      } catch {}
      return { selection: defaults(), status: 'corrupt' };
    },
    save(selection: CmllPracticeSelection): boolean {
      if (!valid(selection)) return false;
      try {
        storage().setItem(key, JSON.stringify(selection));
        return true;
      } catch {
        return false;
      }
    },
  };
}
export function pickCmllCase(
  selection: CmllPracticeSelection,
  previousId: string | null,
  rng: () => number,
): string | null {
  if (!valid(selection) || !selection.caseIds.length) return null;
  const pool =
    selection.caseIds.length > 1
      ? selection.caseIds.filter((id) => id !== previousId)
      : selection.caseIds;
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw Error('The practice random value must be in [0, 1).');
  return pool[Math.floor(value * pool.length)];
}
