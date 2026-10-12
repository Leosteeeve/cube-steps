import { expect, it } from 'vitest';
import { parseRoute, methodRoute } from './routes';
it.each([
  ['#/solve', { kind: 'solve', method: 'lbl' }],
  ['#/solve/cfop', { kind: 'solve', method: 'cfop-beginner' }],
  ['#/solve/roux', { kind: 'solve', method: 'lbl' }],
  ['#/learn/white-cross', { kind: 'learn', method: 'lbl', lessonId: 'white-cross' }],
  ['#/learn/cfop/cfop-f2l', { kind: 'learn', method: 'cfop-beginner', lessonId: 'cfop-f2l' }],
  ['#/learn/cfop/unknown', { kind: 'learn', method: 'cfop-beginner', lessonId: 'intro' }],
  ['#/learn/unknown', { kind: 'learn', method: 'lbl', lessonId: 'notation' }],
])('parses %s without guessing a method', (hash, route) => expect(parseRoute(hash as string)).toEqual(route));
it('builds stable method entry links', () => {
  expect(methodRoute('lbl', 'learn')).toBe('#/learn/notation');
  expect(methodRoute('lbl', 'solve')).toBe('#/solve');
  expect(methodRoute('cfop-beginner', 'learn')).toBe('#/learn/cfop/intro');
  expect(methodRoute('cfop-beginner', 'solve')).toBe('#/solve/cfop');
});
