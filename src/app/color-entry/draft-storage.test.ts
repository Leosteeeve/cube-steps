import { expect, it } from 'vitest';
import { createBlankDraft, createDraftState, reduceDraft } from './draft';
import { createDraftStore } from './draft-storage';
import { GOLDEN_CASES } from '../../../tests/fixtures/facelet-cases';
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
it('recovers unfinished and over-count drafts with face and eraser selection', () => {
  const backing = storage(),
    store = createDraftStore(() => backing);
  let state = createDraftState();
  for (const face of ['F', 'R'] as const)
    for (const index of [0, 1, 2, 3, 5, 6, 7, 8])
      state = reduceDraft(state, { type: 'paint', cell: { face, index } });
  state = reduceDraft(reduceDraft(state, { type: 'select-face', face: 'B' }), {
    type: 'select-color',
    color: null,
  });
  expect(store.save(state.draft)).toBe(true);
  const loaded = createDraftStore(() => backing).load();
  expect(loaded).toEqual({ draft: state.draft, available: true });
  const saved = JSON.parse(backing.data.get('cubesteps.color-draft.v1')!);
  expect(Object.keys(saved)).toEqual(['version', 'draft']);
  expect(Object.keys(saved.draft)).toEqual(['facelets', 'face', 'selection']);
});
it('recovers every sticker of a complete draft and copies the restored arrays', () => {
  const backing = storage(),
    store = createDraftStore(() => backing);
  const draft = {
    facelets: GOLDEN_CASES[7].facelets,
    face: 'U' as const,
    selection: 'orange' as const,
  };
  store.save(draft);
  expect(store.load().draft).toEqual(draft);
  expect(store.load().draft.facelets).not.toBe(draft.facelets);
});
it.each(['{', '{}', 'null', '{"version":2,"draft":{}}'])(
  'safely ignores malformed or unsupported stored data: %s',
  (raw) => {
    const backing = storage();
    backing.setItem('cubesteps.color-draft.v1', raw);
    expect(createDraftStore(() => backing).load()).toEqual({
      draft: createBlankDraft(),
      available: true,
    });
  },
);
it.each(['face', 'selection', 'color', 'center', 'short', 'extra', 'missing'])(
  'ignores invalid draft representation: %s',
  (kind) => {
    const backing = storage(),
      draft: any = structuredClone(createBlankDraft());
    if (kind === 'face') draft.face = 'X';
    if (kind === 'selection') draft.selection = 'purple';
    if (kind === 'color') draft.facelets.F[0] = 'purple';
    if (kind === 'center') draft.facelets.F[4] = 'red';
    if (kind === 'short') draft.facelets.F.pop();
    if (kind === 'extra') draft.facelets.X = [];
    if (kind === 'missing') delete draft.facelets.B;
    backing.setItem('cubesteps.color-draft.v1', JSON.stringify({ version: 1, draft }));
    expect(createDraftStore(() => backing).load()).toEqual({
      draft: createBlankDraft(),
      available: true,
    });
  },
);
it('catches storage access, reading and writing failures without losing an in-memory draft', () => {
  const denied = () => {
    throw new Error('Storage denied');
  };
  for (const store of [
    createDraftStore(denied),
    createDraftStore(() => ({ getItem: denied, setItem: denied })),
  ]) {
    expect(store.load()).toEqual({ draft: createBlankDraft(), available: false });
    expect(store.save(createBlankDraft())).toBe(false);
  }
  const draft = createBlankDraft(),
    before = structuredClone(draft);
  const full = createDraftStore(() => ({ getItem: () => null, setItem: denied }));
  expect(full.load().available).toBe(true);
  expect(full.save(draft)).toBe(false);
  expect(draft).toEqual(before);
});
