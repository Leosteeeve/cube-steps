import { expect, it } from 'vitest';
import { createPracticeStore, PRACTICE_STORAGE_KEY } from './storage';
it('isolates club data and preserves an unsupported selection until explicit reset', () => {
  const data = new Map<string, string>([
    [PRACTICE_STORAGE_KEY, 'global'],
    ['cubesteps.club.practice-selection.v1', '{"version":9}'],
  ]);
  const backing = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  } as Storage;
  const store = createPracticeStore(() => backing, 'cubesteps.club.practice-selection.v1');
  store.load();
  expect(store.save({ version: 1, caseIds: ['pll-z'], groupIds: [] })).toBe(false);
  expect(data.get('cubesteps.club.practice-selection.v1')).toBe('{"version":9}');
  expect(store.reset()).toBe(true);
  expect(store.save({ version: 1, caseIds: ['pll-z'], groupIds: [] })).toBe(true);
  expect(data.get(PRACTICE_STORAGE_KEY)).toBe('global');
});
function memory(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (key: string, v: string) => {
      expect(key).toBe(PRACTICE_STORAGE_KEY);
      value = v;
    },
  } as unknown as Storage;
}
it('recovers_invalid_selection_storage', () => {
  const store = createPracticeStore(() =>
    memory(
      JSON.stringify({
        version: 1,
        caseIds: ['oll-20', 'missing', 'oll-20', 42],
        groupIds: ['oll:No edges oriented'],
        score: 44,
      }),
    ),
  );
  expect(store.load()).toEqual({
    available: true,
    selection: { version: 1, caseIds: ['oll-20'], groupIds: [] },
  });
  for (const value of [
    'bad',
    'null',
    JSON.stringify({ version: 2, caseIds: ['oll-20'] }),
    JSON.stringify({ version: 1, caseIds: 12 }),
  ])
    expect(createPracticeStore(() => memory(value)).load().selection.caseIds).toEqual([]);
  const storage = memory(),
    saved = createPracticeStore(() => storage);
  expect(saved.save({ version: 1, caseIds: ['pll-z'], groupIds: ['bogus'] })).toBe(true);
  expect(JSON.parse(storage.getItem(PRACTICE_STORAGE_KEY)!)).toEqual({
    version: 1,
    caseIds: ['pll-z'],
    groupIds: [],
  });
});
it('blocked storage preserves the session selection without readding group cases', () => {
  const store = createPracticeStore(() => {
    throw Error('Blocked');
  });
  expect(store.load().available).toBe(false);
  expect(store.save({ version: 1, caseIds: ['oll-20'], groupIds: [] })).toBe(false);
  expect(store.load().selection.caseIds).toEqual(['oll-20']);
});
