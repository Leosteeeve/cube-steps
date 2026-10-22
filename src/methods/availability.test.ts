import { expect, it } from 'vitest';
import { availableMethods, methodAvailable } from './availability';
import { getMethodInfo } from './info';
import { parseRoute } from '../app/routes';
import { parseClubRoute } from '../club/routes';
it('keeps Roux in the club edition with lightweight preview metadata', () => {
  expect(availableMethods('global')).toEqual(['lbl', 'cfop-beginner', 'cfop-advanced']);
  expect(availableMethods('club')).toEqual([...availableMethods('global'), 'roux-beginner']);
  expect(methodAvailable('roux-beginner', 'global')).toBe(false);
  expect(getMethodInfo('roux-beginner')).toMatchObject({ teachingStatus: 'preview' });
  expect(getMethodInfo('roux-beginner').stages).toHaveLength(8);
  for (const route of [
    '#/solve/roux',
    '#/learn/roux',
    '#/learn/roux/intro',
    '#/learn/roux/roux-first-block',
  ]) {
    expect(parseRoute(route)).toEqual({ kind: 'not-found' });
    expect(parseClubRoute(route)).toMatchObject({ method: 'roux-beginner' });
  }
  expect(parseClubRoute('#/learn/roux')).toEqual({
    kind: 'learn',
    method: 'roux-beginner',
    lessonId: 'intro',
  });
  for (const tail of ['missing', 'roux-frame', 'intro/extra'])
    expect(parseClubRoute('#/learn/roux/' + tail)).toEqual({ kind: 'not-found' });
});
