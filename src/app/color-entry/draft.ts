import type { Color, Face, Facelets, FaceletRef } from '../../core/types';
import { FACE_ENTRY_ORDER } from '../../core/facelet-layout';
import { COLORS } from '../../core/observations';
export interface ColorDraft {
  facelets: Facelets;
  face: Face;
  selection: Color | null;
}
export interface DraftState {
  draft: ColorDraft;
  history: readonly Facelets[];
  revision: number;
}
export type DraftAction =
  | { type: 'select-face'; face: Face }
  | { type: 'select-color'; color: Color | null }
  | { type: 'paint'; cell: FaceletRef }
  | { type: 'undo' }
  | { type: 'reset' };
function snapshot(facelets: Facelets): Facelets {
  const copy = Object.fromEntries(
    FACE_ENTRY_ORDER.map((face) => [face, [...facelets[face]]]),
  ) as Record<Face, (Color | null)[]>;
  for (const face of FACE_ENTRY_ORDER) Object.freeze(copy[face]);
  return Object.freeze(copy);
}
export function createBlankDraft(): ColorDraft {
  const facelets = Object.fromEntries(
    FACE_ENTRY_ORDER.map((face) => [
      face,
      Array.from({ length: 9 }, (_, index) => (index === 4 ? COLORS[face] : null)),
    ]),
  ) as Record<Face, (Color | null)[]>;
  return { facelets: snapshot(facelets), face: 'F', selection: 'white' };
}
export function createDraftState(draft = createBlankDraft()): DraftState {
  return { draft: { ...draft, facelets: snapshot(draft.facelets) }, history: [], revision: 0 };
}
export function reduceDraft(state: DraftState, action: DraftAction): DraftState {
  if (action.type === 'select-face')
    return { ...state, draft: { ...state.draft, face: action.face } };
  if (action.type === 'select-color')
    return { ...state, draft: { ...state.draft, selection: action.color } };
  if (action.type === 'undo') {
    const previous = state.history.at(-1);
    return previous
      ? {
          draft: { ...state.draft, facelets: previous },
          history: state.history.slice(0, -1),
          revision: state.revision + 1,
        }
      : state;
  }
  let next: Facelets;
  if (action.type === 'reset') next = createBlankDraft().facelets;
  else {
    const { face, index } = action.cell;
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > 8 ||
      index === 4 ||
      state.draft.facelets[face][index] === state.draft.selection
    )
      return state;
    const cells = [...state.draft.facelets[face]];
    cells[index] = state.draft.selection;
    next = snapshot({ ...state.draft.facelets, [face]: cells });
  }
  return {
    draft: { ...state.draft, facelets: next },
    history: [...state.history, state.draft.facelets],
    revision: state.revision + 1,
  };
}
