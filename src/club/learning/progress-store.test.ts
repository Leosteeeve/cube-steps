// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { createClubProgressStore, PROGRESS_KEY } from './progress-store';
beforeEach(() => localStorage.clear());
const value = {
  version: 1 as const,
  selectedMethod: 'lbl' as const,
  lastLesson: { method: 'lbl' as const, lessonId: 'white-cross' },
  practiced: { lbl: ['notation'] },
};
it('round trips validated lessons and keeps editions separate', () => {
  localStorage.setItem('cubesteps.practice-selection.v1', 'global');
  const store = createClubProgressStore(() => localStorage);
  expect(store.save(value)).toBe(true);
  expect(createClubProgressStore(() => localStorage).load().value).toEqual(value);
  expect(localStorage.getItem('cubesteps.practice-selection.v1')).toBe('global');
  expect(store.save({ ...value, lastLesson: { method: 'lbl', lessonId: 'missing' } })).toBe(false);
});
it('preserves pre-Roux progress while adding Roux before its course is lazy-loaded', () => {
  const old = {
    ...value,
    practiced: {
      lbl: ['notation', 'white-cross'],
      'cfop-beginner': ['intro'],
      'cfop-advanced': ['intro'],
    },
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(old));
  const store = createClubProgressStore(() => localStorage),
    loaded = store.load().value;
  expect(loaded.practiced['roux-beginner'] ?? []).toEqual([]);
  expect(
    store.save({
      ...loaded,
      selectedMethod: 'roux-beginner',
      lastLesson: { method: 'roux-beginner', lessonId: 'roux-first-block' },
      practiced: { ...loaded.practiced, 'roux-beginner': ['intro', 'roux-first-block'] },
    }),
  ).toBe(true);
  const saved = createClubProgressStore(() => localStorage).load();
  expect(saved.writable).toBe(true);
  for (const id of ['lbl', 'cfop-beginner', 'cfop-advanced'] as const)
    expect(saved.value.practiced[id]).toEqual(old.practiced[id]);
  expect(saved.value.practiced['roux-beginner']).toEqual(['intro', 'roux-first-block']);
});
it.each([
  '{',
  'null',
  '{"version":2}',
  JSON.stringify({ ...value, practiced: { lbl: ['missing'] } }),
])('preserves unsupported data until Reset: %s', (raw) => {
  localStorage.setItem(PROGRESS_KEY, raw);
  const store = createClubProgressStore(() => localStorage);
  expect(store.load()).toMatchObject({ writable: false, available: true });
  expect(store.save(value)).toBe(false);
  expect(store.load().value).toEqual(value);
  expect(localStorage.getItem(PROGRESS_KEY)).toBe(raw);
  expect(store.reset()).toBe(true);
  expect(store.save(value)).toBe(true);
});
it('keeps session state when access or quota fails and recovers on retry', () => {
  let deny = true;
  const backing = {
    getItem: () => null,
    setItem: () => {
      if (deny) throw Error('quota');
    },
    removeItem: () => {},
  } as unknown as Storage;
  const store = createClubProgressStore(() => backing);
  expect(store.save(value)).toBe(false);
  expect(store.load().value).toEqual(value);
  deny = false;
  expect(store.save(value)).toBe(true);
  const blocked = createClubProgressStore(() => {
    throw Error('denied');
  });
  expect(blocked.load().available).toBe(false);
  expect(blocked.save(value)).toBe(false);
  expect(blocked.load().value).toEqual(value);
});
