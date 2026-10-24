import { expect, it, vi } from 'vitest';
import { createRouxLabPreferences } from './preferences';
it('defaults to eight frames and refuses an empty or foreign subset', () => {
  const storage = { getItem: () => null, setItem: vi.fn() },
    store = createRouxLabPreferences(() => storage);
  expect(store.load().frames).toHaveLength(8);
  expect(store.save([])).toBe(false);
  expect(store.save(['white-blue', 'white-blue'])).toBe(false);
  expect(store.save(['blue-white'] as never)).toBe(false);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(store.save(['yellow-red'])).toBe(true);
});
it('keeps corrupt stored settings untouched until an explicit save and tolerates storage failure', () => {
  const storage = { getItem: () => '{broken', setItem: vi.fn() },
    store = createRouxLabPreferences(() => storage);
  expect(store.load()).toMatchObject({ status: 'corrupt' });
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(
    createRouxLabPreferences(() => {
      throw Error('denied');
    }).load().status,
  ).toBe('unavailable');
});
