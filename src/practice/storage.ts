import { ALGORITHM_REGISTRY as registry } from '../algorithms/registry';
export interface PracticeSelection {
  version: 1;
  caseIds: string[];
  groupIds: string[];
}
export const PRACTICE_STORAGE_KEY = 'cubesteps.practice-selection.v1';
const entries = Object.values(registry.cases);
export const PRACTICE_GROUPS = [...new Set(entries.map((c) => c.family + ':' + c.group))].map(
  (id) => {
    const cases = entries.filter((c) => c.family + ':' + c.group === id);
    return { id, family: cases[0].family, label: cases[0].group, caseIds: cases.map((c) => c.id) };
  },
);
export function normalizePracticeSelection(raw: unknown): PracticeSelection {
  const valid =
    raw &&
    typeof raw === 'object' &&
    'version' in raw &&
    raw.version === 1 &&
    'caseIds' in raw &&
    Array.isArray(raw.caseIds)
      ? new Set(raw.caseIds.filter((id) => typeof id === 'string'))
      : new Set<string>();
  const caseIds = entries.filter((c) => valid.has(c.id)).map((c) => c.id);
  return {
    version: 1,
    caseIds,
    groupIds: PRACTICE_GROUPS.filter((g) => g.caseIds.every((id) => valid.has(id))).map(
      (g) => g.id,
    ),
  };
}
export function createPracticeStore(storage: () => Storage, key = PRACTICE_STORAGE_KEY) {
  let memory = normalizePracticeSelection(null),
    memoryOnly = false,
    protectedData = false,
    loaded = false;
  const store = {
    load(): { selection: PracticeSelection; available: boolean } {
      if (memoryOnly || protectedData)
        return { selection: structuredClone(memory), available: false };
      loaded = true;
      try {
        const text = storage().getItem(key);
        let raw: unknown = null;
        try {
          raw = text ? JSON.parse(text) : null;
        } catch {
          /* Invalid local data resets only this selection. */
        }
        if (key !== PRACTICE_STORAGE_KEY && text !== null) {
          const r = raw as PracticeSelection | null;
          protectedData =
            !r ||
            r.version !== 1 ||
            !Array.isArray(r.caseIds) ||
            r.caseIds.some((id) => typeof id !== 'string' || !Object.hasOwn(registry.cases, id));
        }
        memory = normalizePracticeSelection(raw);
        return { selection: structuredClone(memory), available: !protectedData };
      } catch {
        memoryOnly = true;
        return { selection: structuredClone(memory), available: false };
      }
    },
    save(selection: PracticeSelection): boolean {
      if (!loaded) store.load();
      memory = normalizePracticeSelection(selection);
      if (protectedData) return false;
      try {
        storage().setItem(key, JSON.stringify(memory));
        memoryOnly = false;
        return true;
      } catch {
        memoryOnly = true;
        return false;
      }
    },
    isProtected: () => protectedData,
    reset(): boolean {
      try {
        storage().setItem(key, JSON.stringify(normalizePracticeSelection(null)));
        protectedData = false;
        memoryOnly = false;
        memory = normalizePracticeSelection(null);
        loaded = true;
        return true;
      } catch {
        return false;
      }
    },
  };
  return store;
}
export const practiceStore = createPracticeStore(() => localStorage);
