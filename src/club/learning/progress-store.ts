import { getCourse } from '../../content/courses';
import type { MethodId } from '../../core/types';
import { CLUB_METHODS, type ClubProgress } from './types';
import { ROUX_INFO } from '../../methods/info';
export const PROGRESS_KEY = 'cubesteps.club.progress.v1';
export const emptyProgress = (): ClubProgress => ({
  version: 1,
  selectedMethod: 'lbl',
  practiced: {},
});
export const validLesson = (method: MethodId, id: string) =>
  CLUB_METHODS.includes(method) &&
  (method === 'roux-beginner'
    ? id === 'intro' || ROUX_INFO.stages.slice(1).some((s) => s.id === id)
    : getCourse(method).some((l) => l.id === id));
function valid(raw: unknown): raw is ClubProgress {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as ClubProgress;
  return (
    r.version === 1 &&
    CLUB_METHODS.includes(r.selectedMethod) &&
    !!r.practiced &&
    typeof r.practiced === 'object' &&
    !Array.isArray(r.practiced) &&
    Object.entries(r.practiced).every(
      ([method, ids]) =>
        CLUB_METHODS.includes(method as MethodId) &&
        Array.isArray(ids) &&
        ids.every((id) => typeof id === 'string' && validLesson(method as MethodId, id)),
    ) &&
    (r.lastLesson === undefined ||
      (!!r.lastLesson && validLesson(r.lastLesson.method, r.lastLesson.lessonId)))
  );
}
function copy(r: ClubProgress): ClubProgress {
  return {
    version: 1,
    selectedMethod: r.selectedMethod,
    ...(r.lastLesson ? { lastLesson: { ...r.lastLesson } } : {}),
    practiced: structuredClone(r.practiced),
  };
}
export function createClubProgressStore(storage: () => Storage) {
  let value = emptyProgress(),
    available = true,
    writable = true,
    loaded = false;
  function load() {
    if (!loaded) {
      loaded = true;
      try {
        const raw = storage().getItem(PROGRESS_KEY);
        if (raw !== null) {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (valid(parsed)) value = copy(parsed);
            else writable = false;
          } catch {
            writable = false;
          }
        }
      } catch {
        available = false;
      }
    }
    return { value: copy(value), available, writable };
  }
  return {
    load,
    save(next: ClubProgress) {
      load();
      if (!valid(next)) return false;
      value = copy(next);
      if (!writable) return false;
      try {
        storage().setItem(PROGRESS_KEY, JSON.stringify(value));
        available = true;
        return true;
      } catch {
        available = false;
        return false;
      }
    },
    reset() {
      value = emptyProgress();
      loaded = true;
      try {
        storage().setItem(PROGRESS_KEY, JSON.stringify(value));
        writable = true;
        available = true;
        return true;
      } catch {
        available = false;
        return false;
      }
    },
  };
}
