import type { MethodId } from '../core/types';
import { getMethod } from '../methods/registry';
export type AppRoute = { kind: 'solve'; method: MethodId } | { kind: 'learn'; method: MethodId; lessonId: string };
export function parseRoute(hash: string): AppRoute {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'solve') return { kind: 'solve', method: parts[1] === 'cfop' && parts.length === 2 ? 'cfop-beginner' : 'lbl' };
  const method: MethodId = parts[0] === 'learn' && parts[1] === 'cfop' ? 'cfop-beginner' : 'lbl';
  const intro = method === 'lbl' ? 'notation' : 'intro';
  const candidate = parts[method === 'lbl' ? 1 : 2];
  const lessonId = candidate === intro || getMethod(method).stages.some(s => s.id === candidate) ? candidate : intro;
  return { kind: 'learn', method, lessonId };
}
export function methodRoute(method: MethodId, kind: 'learn' | 'solve'): string {
  return kind === 'solve' ? method === 'lbl' ? '#/solve' : '#/solve/cfop' : method === 'lbl' ? '#/learn/notation' : '#/learn/cfop/intro';
}
