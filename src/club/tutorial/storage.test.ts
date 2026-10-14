import { describe, expect, it } from 'vitest';
import { createTutorialStore, defaultPreferences, TUTORIAL_KEY } from './storage';

function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  } as unknown as Storage & { data: Map<string, string> };
}
describe('tutorial storage', () => {
  it('preserves future and corrupt saved values', () => {
    for (const raw of ['broken', '{"version":2}', '{"version":1,"welcome":"never"}']) {
      const s = storage();
      s.setItem(TUTORIAL_KEY, raw);
      const store = createTutorialStore(() => s);
      expect(store.load()).toMatchObject({
        available: true,
        writable: false,
        value: { welcome: 'later' },
      });
      expect(store.save(defaultPreferences())).toBe(false);
      expect(s.getItem(TUTORIAL_KEY)).toBe(raw);
    }
  });
  it('reset touches only the tutorial key', () => {
    const s = storage();
    s.setItem('practice', 'keep');
    s.setItem(TUTORIAL_KEY, 'broken');
    const store = createTutorialStore(() => s);
    store.load();
    expect(store.reset()).toBe(true);
    expect(s.getItem('practice')).toBe('keep');
    expect(s.getItem(TUTORIAL_KEY)).toBeNull();
    expect(store.save(defaultPreferences())).toBe(true);
    expect(store.load().value).toEqual(defaultPreferences());
  });
  it('continues in memory when storage is denied', () => {
    const store = createTutorialStore(() => {
      throw Error('denied');
    });
    expect(store.load()).toMatchObject({ available: false, writable: false });
    expect(store.save(defaultPreferences())).toBe(false);
    expect(store.reset()).toBe(false);
  });
  it('does not overwrite newer data written after loading', () => {
    const s = storage(),
      store = createTutorialStore(() => s);
    store.load();
    s.setItem(TUTORIAL_KEY, '{"version":9}');
    expect(store.save(defaultPreferences())).toBe(false);
    expect(s.getItem(TUTORIAL_KEY)).toBe('{"version":9}');
  });
});
