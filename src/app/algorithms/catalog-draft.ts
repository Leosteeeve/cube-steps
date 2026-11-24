import { useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { useEdition, type Edition } from '../edition';

interface CatalogDraft<T> {
  search: string;
  family: string;
  group: string;
  practice: T;
}

export const clearCatalogFilters = { search: '', family: 'all', group: 'all' };

// The engine lives for this app session. Keep browsing drafts out of the user's saved practice record.
export function createCatalogDraft<T>() {
  type Entry = { draft: CatalogDraft<T>; savedKey: string };
  const sessions = new WeakMap<CubeEngine, Partial<Record<Edition, Entry>>>();
  return function useCatalogDraft(engine: CubeEngine, saved: T) {
    const edition = useEdition();
    const savedKey = JSON.stringify(saved);
    const [draft, setDraft] = useState<CatalogDraft<T>>(() => {
      const prior = sessions.get(engine)?.[edition];
      if (!prior) return { ...clearCatalogFilters, practice: saved };
      // A practice-page edit takes precedence over an older library selection.
      return {
        ...prior.draft,
        practice: prior.savedKey === savedKey ? prior.draft.practice : saved,
      };
    });
    function update(change: Partial<CatalogDraft<T>>) {
      const next = { ...draft, ...change };
      sessions.set(engine, { ...sessions.get(engine), [edition]: { draft: next, savedKey } });
      setDraft(next);
    }
    function finishSelection() {
      sessions.set(engine, { ...sessions.get(engine), [edition]: { draft, savedKey: '' } });
    }
    return [draft, update, finishSelection] as const;
  };
}

export function changeCaseSelection(
  selected: readonly string[],
  ids: readonly string[],
  checked: boolean,
) {
  return checked ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id));
}

function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ')
    .trim();
}

function identifier(text: string) {
  return words(text)
    .replace(/ /g, '')
    .replace(/^cmll/, '')
    .replace(/\d+$/, (number) => number.replace(/^0+(?=\d)/, ''));
}

export function matchesCatalogCase(
  search: string,
  entry: { id: string; label: string; family: string; group?: string },
  families: readonly string[],
) {
  const query = words(search);
  if (!query) return true;
  const key = identifier(query);
  if (families.some((family) => identifier(family) === key))
    return identifier(entry.family) === key;
  const caseId = identifier(entry.id);
  if (/^\d+$/.test(key)) return caseId.match(/\d+$/)?.[0] === key;
  if (/\d$/.test(key)) return caseId === key;
  return (
    caseId === key ||
    [entry.label, entry.id, entry.group ?? '', entry.family + ' ' + entry.label].some((field) =>
      words(field).includes(query),
    )
  );
}
