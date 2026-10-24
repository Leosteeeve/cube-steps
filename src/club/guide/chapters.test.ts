import { expect, it } from 'vitest';
import { GUIDE_CHAPTERS } from './chapters';
import { TOURS } from '../tutorial/catalog';
import { parseClubRoute } from '../routes';
it('documents fixed trials, honest paired summaries and deliberate file transfer', () => {
  const lab = GUIDE_CHAPTERS.find((c) => c.id === 'lab')!;
  expect(lab.screenshotIds).toContain('lab-trials');
  const copy = JSON.stringify(lab);
  for (const phrase of [
    'five complete',
    '300',
    'External',
    'revision',
    'Import preview',
    'tester labels',
    'Archived',
    'AB/BA',
  ])
    expect(copy).toContain(phrase);
});
it('covers every tour section with substantial original instructions and valid destinations', () => {
  expect(GUIDE_CHAPTERS.map((c) => c.id)).toEqual([
    'start',
    'moves',
    'lessons',
    'roux',
    'advanced-roux',
    'solve',
    'algorithms',
    'practice',
    'timer',
    'lab',
    'roux-lab',
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
it('explains bounded Roux search, both-block trials and the original accepted video context', () => {
  const advanced = GUIDE_CHAPTERS.find((c) => c.id === 'advanced-roux')!,
    lab = GUIDE_CHAPTERS.find((c) => c.id === 'roux-lab')!;
  expect(advanced).toBeDefined();
  expect(lab).toBeDefined();
  expect(advanced.href).toBe('#/learn/advanced-roux/intro');
  expect(lab.href).toBe('#/roux-lab');
  for (const phrase of ['42', 'eight', 'M′', 'basic LSE', 'Preview'])
    expect(JSON.stringify(advanced)).toContain(phrase);
  for (const phrase of [
    'both blocks',
    'five complete',
    '300',
    'Import preview',
    'tester labels',
    'not proved',
    'AB/BA',
  ])
    expect(JSON.stringify(lab).toLowerCase()).toContain(phrase.toLowerCase());
  expect(parseClubRoute('#/guide/advanced-roux')).toEqual({
    kind: 'guide',
    section: 'advanced-roux',
  });
  expect(parseClubRoute('#/guide/roux-lab')).toEqual({ kind: 'guide', section: 'roux-lab' });
});
it('documents the fixed Roux hold, middle centers and full lesson/solver destinations', () => {
  const roux = GUIDE_CHAPTERS.find((c) => c.id === 'roux')!;
  expect(roux.href).toBe('#/learn/roux/intro');
  for (const phrase of ['M′', 'blue left', 'yellow cross', 'CFOP', 'Preview'])
    expect(JSON.stringify(roux)).toContain(phrase);
  expect(parseClubRoute('#/guide/roux')).toEqual({ kind: 'guide', section: 'roux' });
  expect(parseClubRoute('#/solve/roux')).toEqual({ kind: 'solve', method: 'roux-beginner' });
});
