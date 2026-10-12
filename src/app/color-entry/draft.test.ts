import { expect, it } from 'vitest';
import { createBlankDraft, createDraftState, reduceDraft } from './draft';
import { COLORS } from '../../core/observations';
import { FACE_ENTRY_ORDER } from '../../core/facelet-layout';
it('starts unfilled with six locked standard centers', () => {
  const state = createDraftState();
  expect(
    Object.values(state.draft.facelets)
      .flat()
      .filter((color) => color === null),
  ).toHaveLength(48);
  for (const face of FACE_ENTRY_ORDER) {
    expect(state.draft.facelets[face][4]).toBe(COLORS[face]);
    expect(reduceDraft(state, { type: 'paint', cell: { face, index: 4 } })).toBe(state);
  }
  expect(state.draft).toMatchObject({ face: 'F', selection: 'white' });
});
it('paints, overwrites, erases and undoes without mutating earlier drafts', () => {
  const start = createDraftState(),
    cell = { face: 'F' as const, index: 0 };
  const painted = reduceDraft(start, { type: 'paint', cell });
  expect(painted.draft.facelets.F[0]).toBe('white');
  expect(start.draft.facelets.F[0]).toBeNull();
  const red = reduceDraft(reduceDraft(painted, { type: 'select-color', color: 'red' }), {
    type: 'paint',
    cell,
  });
  expect(red.draft.facelets.F[0]).toBe('red');
  const erased = reduceDraft(reduceDraft(red, { type: 'select-color', color: null }), {
    type: 'paint',
    cell,
  });
  expect(erased.draft.facelets.F[0]).toBeNull();
  const undone = reduceDraft(erased, { type: 'undo' });
  expect(undone.draft.facelets.F[0]).toBe('red');
  expect(undone.draft.selection).toBeNull();
  expect(undone.revision).toBeGreaterThan(erased.revision);
  expect(painted.draft.facelets.F[0]).toBe('white');
});
it('revisits faces without painting or changing selection and ignores no-op paint', () => {
  const painted = reduceDraft(createDraftState(), { type: 'paint', cell: { face: 'F', index: 0 } });
  const next = reduceDraft(painted, { type: 'select-face', face: 'B' });
  expect(next.draft.facelets).toEqual(painted.draft.facelets);
  expect(next.draft.selection).toBe('white');
  expect(next.revision).toBe(painted.revision);
  expect(reduceDraft(next, { type: 'paint', cell: { face: 'F', index: 0 } })).toBe(next);
  expect(reduceDraft(next, { type: 'paint', cell: { face: 'B', index: 10 } })).toBe(next);
});
it('resets all 48 stickers as one undoable action and preserves the current grip', () => {
  let state = createDraftState();
  for (const face of FACE_ENTRY_ORDER)
    state = reduceDraft(state, { type: 'paint', cell: { face, index: 0 } });
  state = reduceDraft(state, { type: 'select-face', face: 'D' });
  const reset = reduceDraft(state, { type: 'reset' });
  expect(reset.draft.facelets).toEqual(createBlankDraft().facelets);
  expect(reset.draft.face).toBe('D');
  expect(reset.history).toHaveLength(state.history.length + 1);
  expect(reduceDraft(reset, { type: 'undo' }).draft.facelets).toEqual(state.draft.facelets);
});
it('copies supplied drafts and leaves empty undo as a no-op', () => {
  const draft = createBlankDraft(),
    state = createDraftState(draft);
  expect(state.draft.facelets).not.toBe(draft.facelets);
  expect(reduceDraft(state, { type: 'undo' })).toBe(state);
});
