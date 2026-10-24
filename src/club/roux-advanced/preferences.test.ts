import { expect, it, vi } from 'vitest';
import { CMLL_CATALOG } from '../../methods/roux-advanced/cmll/catalog';
import { createCmllPracticeStore, pickCmllCase } from './preferences';
import { availableMethods } from '../../methods/availability';
import { parseClubRoute } from '../routes';
import { parseRoute } from '../../app/routes';
it('offers all 42 unique cases, handles empty and singleton selections, and avoids immediate repeats', () => {
  const store = createCmllPracticeStore(() => ({ getItem: () => null, setItem: () => {} })),
    selection = store.load().selection;
  expect(new Set(selection.caseIds).size).toBe(42);
  expect(selection.frameId).toBe('white-blue');
  expect(pickCmllCase({ ...selection, caseIds: [] }, null, () => 0)).toBeNull();
  const id = selection.caseIds[0];
  expect(pickCmllCase({ ...selection, caseIds: [id] }, id, () => 0.8)).toBe(id);
  expect(pickCmllCase(selection, id, () => 0)).not.toBe(id);
});
it('round trips an explicit selection and leaves corrupt storage untouched on read', () => {
  let raw: string | null = null;
  const setItem = vi.fn((_key: string, value: string) => {
      raw = value;
    }),
    store = createCmllPracticeStore(() => ({ getItem: () => raw, setItem })),
    selected = {
      version: 1 as const,
      caseIds: [CMLL_CATALOG.cases[1].id],
      frameId: 'yellow-red' as const,
    };
  expect(store.save(selected)).toBe(true);
  expect(store.load().selection).toEqual(selected);
  raw = '{broken';
  setItem.mockClear();
  expect(store.load().status).toBe('corrupt');
  expect(setItem).not.toHaveBeenCalled();
  const denied = createCmllPracticeStore(() => {
    throw Error('Storage unavailable');
  });
  expect(denied.load().status).toBe('unavailable');
  expect(denied.save(selected)).toBe(false);
});
it('routes CMLL and Advanced Roux only in the club while preserving existing links', () => {
  const id = CMLL_CATALOG.cases[0].id;
  expect(availableMethods('global')).not.toContain('roux-advanced');
  expect(availableMethods('club')).toContain('roux-advanced');
  expect(parseClubRoute('#/cmll')).toEqual({ kind: 'cmll-library' });
  expect(parseClubRoute('#/cmll/' + id)).toEqual({ kind: 'cmll-case', caseId: id });
  expect(parseClubRoute('#/cmll/unknown')).toEqual({ kind: 'not-found' });
  expect(parseClubRoute('#/cmll-practice')).toEqual({ kind: 'cmll-practice' });
  expect(parseClubRoute('#/solve/advanced-roux')).toEqual({
    kind: 'solve',
    method: 'roux-advanced',
  });
  expect(parseRoute('#/solve/advanced-roux')).toEqual({ kind: 'not-found' });
  expect(parseClubRoute('#/lab')).toEqual({ kind: 'lab', view: 'analyze' });
  expect(parseClubRoute('#/solve/roux')).toEqual({ kind: 'solve', method: 'roux-beginner' });
});
