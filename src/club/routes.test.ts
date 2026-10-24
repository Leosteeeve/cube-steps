import { expect, it } from 'vitest';
import { parseClubRoute } from './routes';
import { parseRoute } from '../app/routes';
it('routes the club Roux workspace separately from CFOP and the global edition', () => {
  for (const [suffix, view] of [
    ['', 'analyze'],
    ['/compare', 'compare'],
    ['/trials', 'trials'],
  ] as const) {
    expect(parseClubRoute(`#/roux-lab${suffix}`)).toEqual({ kind: 'roux-lab', view });
    expect(parseRoute(`#/roux-lab${suffix}`)).toEqual({ kind: 'not-found' });
  }
  expect(parseClubRoute('#/roux-lab/missing')).toEqual({ kind: 'not-found' });
});
it('keeps all Lab links club-only and rejects unknown Lab suffixes', () => {
  for (const [hash, view] of [
    ['#/lab', 'analyze'],
    ['#/lab/compare', 'compare'],
    ['#/lab/trials', 'trials'],
  ] as const) {
    expect(parseClubRoute(hash)).toEqual({ kind: 'lab', view });
    expect(parseRoute(hash)).toEqual({ kind: 'not-found' });
  }
  expect(parseClubRoute('#/lab/missing')).toEqual({ kind: 'not-found' });
});
it('supports the club Guide and rejects unknown sections without changing global routes', () => {
  expect(parseClubRoute('#/guide')).toEqual({ kind: 'guide' });
  expect(parseClubRoute('#/guide/timer')).toEqual({ kind: 'guide', section: 'timer' });
  expect(parseClubRoute('#/guide/unknown')).toEqual({ kind: 'not-found' });
  expect(parseRoute('#/guide')).toEqual({ kind: 'not-found' });
});
it('keeps the explorer in the club entry', () => {
  expect(parseClubRoute('#/moves')).toEqual({ kind: 'moves' });
  expect(parseRoute('#/moves')).toEqual({ kind: 'not-found' });
  expect(parseClubRoute('#/learn/notation')).toEqual({
    kind: 'learn',
    method: 'lbl',
    lessonId: 'notation',
  });
});
it('separates club home and local features from global course routes', () => {
  for (const hash of ['', '#', '#/', '#/home'])
    expect(parseClubRoute(hash)).toEqual({ kind: 'home' });
  expect(parseClubRoute('#/find-your-route')).toEqual({ kind: 'quiz' });
  expect(parseClubRoute('#/timer')).toEqual({ kind: 'timer' });
  expect(parseClubRoute('#/learn/cfop/intro')).toEqual({
    kind: 'learn',
    method: 'cfop-beginner',
    lessonId: 'intro',
  });
  expect(parseClubRoute('#/learn/absent')).toEqual({ kind: 'not-found' });
  expect(parseRoute('')).toEqual({ kind: 'learn', method: 'lbl', lessonId: 'notation' });
});
