import { expect, it } from 'vitest';
import { GUIDE_CHAPTERS } from './chapters';
import { TOURS } from '../tutorial/catalog';
import { parseClubRoute } from '../routes';
it('covers every tour section with substantial original instructions and valid destinations', () => {
  expect(GUIDE_CHAPTERS.map((c) => c.id)).toEqual([
    'start',
    'moves',
    'lessons',
    'solve',
    'algorithms',
    'practice',
    'timer',
    'help',
  ]);
  for (const c of GUIDE_CHAPTERS) {
    expect(c.steps.length).toBeGreaterThan(1);
    expect(c.controls.length).toBeGreaterThan(1);
    for (const id of c.tourIds) expect(TOURS[id]).toBeDefined();
    if (c.href) expect(parseClubRoute(c.href).kind).not.toBe('not-found');
  }
  for (const t of Object.values(TOURS))
    for (const s of t.steps) expect(GUIDE_CHAPTERS.some((c) => c.id === s.guideSection)).toBe(true);
});
