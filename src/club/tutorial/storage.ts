import type { TutorialPreferences } from './types';
export const TUTORIAL_KEY = 'cubesteps.club.tutorial.v1';
export const defaultPreferences = (): TutorialPreferences => ({
  version: 1,
  welcome: 'new',
  dismissed: {},
  tours: {},
});
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
function valid(x: unknown): x is TutorialPreferences {
  if (
    !record(x) ||
    x.version !== 1 ||
    !['new', 'later', 'started', 'never'].includes(String(x.welcome)) ||
    !record(x.dismissed) ||
    !record(x.tours)
  )
    return false;
  return (
    Object.values(x.dismissed).every((v) => Number.isInteger(v) && Number(v) >= 0) &&
    Object.values(x.tours).every(
      (v) =>
        record(v) &&
        Number.isInteger(v.contentVersion) &&
        Number(v.contentVersion) >= 0 &&
        typeof v.completed === 'boolean' &&
        (v.nextStepId === undefined || typeof v.nextStepId === 'string'),
    )
  );
}
function decode(raw: string | null) {
  if (raw === null) return defaultPreferences();
  try {
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : null;
  } catch {
    return null;
  }
}
export function createTutorialStore(getStorage: () => Storage) {
  let writable = true;
  return {
    load() {
      try {
        const value = decode(getStorage().getItem(TUTORIAL_KEY));
        writable = value !== null;
        return {
          value: value ?? { ...defaultPreferences(), welcome: 'later' as const },
          available: true,
          writable,
        };
      } catch {
        writable = false;
        return {
          value: { ...defaultPreferences(), welcome: 'later' as const },
          available: false,
          writable,
        };
      }
    },
    save(value: TutorialPreferences) {
      if (!writable) return false;
      try {
        const storage = getStorage();
        if (!decode(storage.getItem(TUTORIAL_KEY))) {
          writable = false;
          return false;
        }
        storage.setItem(TUTORIAL_KEY, JSON.stringify(value));
        return true;
      } catch {
        writable = false;
        return false;
      }
    },
    reset() {
      try {
        getStorage().removeItem(TUTORIAL_KEY);
        writable = true;
        return true;
      } catch {
        return false;
      }
    },
  };
}
