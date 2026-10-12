import { createBlankDraft, createDraftState, type ColorDraft } from './draft';
import { FACE_ENTRY_ORDER } from '../../core/facelet-layout';
import { COLORS } from '../../core/observations';
const STORAGE_KEY = 'cubesteps.color-draft.v1';
const knownColors = Object.values(COLORS);
function validDraft(value: unknown): value is ColorDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as ColorDraft;
  return (
    FACE_ENTRY_ORDER.includes(draft.face) &&
    (draft.selection === null || knownColors.includes(draft.selection)) &&
    !!draft.facelets &&
    typeof draft.facelets === 'object' &&
    !Array.isArray(draft.facelets) &&
    Object.keys(draft.facelets).length === 6 &&
    FACE_ENTRY_ORDER.every(
      (face) =>
        Object.hasOwn(draft.facelets, face) &&
        Array.isArray(draft.facelets[face]) &&
        draft.facelets[face].length === 9 &&
        draft.facelets[face][4] === COLORS[face] &&
        draft.facelets[face].every((color) => color === null || knownColors.includes(color)),
    )
  );
}
export function createDraftStore(open: () => Pick<Storage, 'getItem' | 'setItem'>) {
  return {
    load(): { draft: ColorDraft; available: boolean } {
      let raw: string | null;
      try {
        raw = open().getItem(STORAGE_KEY);
      } catch {
        return { draft: createBlankDraft(), available: false };
      }
      try {
        const data: unknown = raw === null ? null : JSON.parse(raw);
        if (
          data &&
          typeof data === 'object' &&
          'version' in data &&
          data.version === 1 &&
          'draft' in data &&
          validDraft(data.draft)
        ) {
          const { facelets, face, selection } = data.draft;
          return { draft: createDraftState({ facelets, face, selection }).draft, available: true };
        }
      } catch {
        /* An invalid stored draft is recoverable by starting blank. */
      }
      return { draft: createBlankDraft(), available: true };
    },
    save(draft: ColorDraft): boolean {
      try {
        const { facelets, face, selection } = draft;
        open().setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, draft: { facelets, face, selection } }),
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}
