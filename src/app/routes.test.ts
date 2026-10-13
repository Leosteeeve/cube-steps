import { expect, it } from 'vitest';
import { parseRoute, methodRoute, lessonRoute } from './routes';
it.each([
  ['#/solve', { kind: 'solve', method: 'lbl' }],
  ['#/solve/cfop', { kind: 'solve', method: 'cfop-beginner' }],
  ['#/learn/white-cross', { kind: 'learn', method: 'lbl', lessonId: 'white-cross' }],
  ['#/learn/cfop/cfop-f2l', { kind: 'learn', method: 'cfop-beginner', lessonId: 'cfop-f2l' }],
])('parses %s without guessing a method', (hash, route) =>
  expect(parseRoute(hash as string)).toEqual(route),
);
it('builds stable method entry links', () => {
  expect(methodRoute('lbl', 'learn')).toBe('#/learn/notation');
  expect(methodRoute('lbl', 'solve')).toBe('#/solve');
  expect(methodRoute('cfop-beginner', 'learn')).toBe('#/learn/cfop/intro');
  expect(methodRoute('cfop-beginner', 'solve')).toBe('#/solve/cfop');
  expect(methodRoute('cfop-advanced', 'solve')).toBe('#/solve/advanced-cfop');
  expect(methodRoute('cfop-advanced', 'learn')).toBe('#/learn/advanced-cfop/intro');
  expect(lessonRoute('cfop-advanced', 'advanced-f2l')).toBe('#/learn/advanced-cfop/advanced-f2l');
});
it('reports_unknown_method_routes', () => {
  for (const hash of [
    '#/solve/roux',
    '#/learn/cfop/unknown',
    '#/learn/unknown',
    '#/solve/advanced-cfop/extra',
    '#/learn/zz/intro',
    '#/missing',
  ]) {
    expect(parseRoute(hash)).toMatchObject({ kind: 'not-found' });
  }
  expect(parseRoute('#/solve/advanced-cfop')).toEqual({ kind: 'solve', method: 'cfop-advanced' });
  expect(parseRoute('#/learn/advanced-cfop/advanced-pll')).toEqual({
    kind: 'learn',
    method: 'cfop-advanced',
    lessonId: 'advanced-pll',
  });
});
