import { expect, it } from 'vitest';
import { parseClubRoute } from './routes';
import { parseRoute } from '../app/routes';
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
