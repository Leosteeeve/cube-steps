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
export function createPracticeStore(storage: () => Storage) {
  let memory = normalizePracticeSelection(null),
    memoryOnly = false;
  return {
    load(): { selection: PracticeSelection; available: boolean } {
      if (memoryOnly) return { selection: structuredClone(memory), available: false };
      try {
        const text = storage().getItem(PRACTICE_STORAGE_KEY);
        let raw: unknown = null;
        try {
          raw = text ? JSON.parse(text) : null;
        } catch {
          /* Invalid local data resets only this selection. */
        }
        memory = normalizePracticeSelection(raw);
        return { selection: structuredClone(memory), available: true };
      } catch {
        memoryOnly = true;
        return { selection: structuredClone(memory), available: false };
      }
    },
    save(selection: PracticeSelection): boolean {
      memory = normalizePracticeSelection(selection);
      try {
        storage().setItem(PRACTICE_STORAGE_KEY, JSON.stringify(memory));
        memoryOnly = false;
        return true;
      } catch {
        memoryOnly = true;
        return false;
      }
    },
  };
}
export const practiceStore = createPracticeStore(() => localStorage);
