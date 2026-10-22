import type { MethodId } from '../core/types';
import { getMethodInfo as getMethod } from '../methods/info';
export type AppRoute =
  | { kind: 'practice' }
  | { kind: 'algorithms' }
  | { kind: 'algorithm'; caseId: string }
  | { kind: 'solve'; method: MethodId }
  | { kind: 'learn'; method: MethodId; lessonId: string }
  | { kind: 'not-found' };
const slugs: Record<MethodId, string> = {
  lbl: '',
  'cfop-beginner': 'cfop',
  'cfop-advanced': 'advanced-cfop',
  'roux-beginner': 'roux',
};
const fromSlug = (slug: string): MethodId | undefined =>
  slug === 'cfop' ? 'cfop-beginner' : slug === 'advanced-cfop' ? 'cfop-advanced' : undefined;
export function parseRoute(hash: string): AppRoute {
  const value = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!value || value === 'learn') return { kind: 'learn', method: 'lbl', lessonId: 'notation' };
  const parts = value.split('/');
  if (value === 'practice') return { kind: 'practice' };
  if (parts[0] === 'algorithms') {
    if (parts.length === 1) return { kind: 'algorithms' };
    return parts.length === 2 ? { kind: 'algorithm', caseId: parts[1] } : { kind: 'not-found' };
  }
  if (parts[0] === 'solve') {
    if (parts.length === 1) return { kind: 'solve', method: 'lbl' };
    const method = fromSlug(parts[1]);
    return method && parts.length === 2 ? { kind: 'solve', method } : { kind: 'not-found' };
  }
  if (parts[0] !== 'learn') return { kind: 'not-found' };
  const specific = fromSlug(parts[1]),
    method = specific ?? 'lbl',
    intro = method === 'lbl' ? 'notation' : 'intro';
  if (parts.length > (specific ? 3 : 2)) return { kind: 'not-found' };
  const lessonId = parts[specific ? 2 : 1] ?? intro;
  if (lessonId !== intro && !getMethod(method).stages.some((s) => s.id === lessonId))
    return { kind: 'not-found' };
  return { kind: 'learn', method, lessonId };
}
export function lessonRoute(method: MethodId, lessonId: string): string {
  getMethod(method);
  return '#/learn/' + (slugs[method] ? slugs[method] + '/' : '') + lessonId;
}
export function methodRoute(method: MethodId, kind: 'learn' | 'solve'): string {
  getMethod(method);
  return kind === 'learn'
    ? lessonRoute(method, method === 'lbl' ? 'notation' : 'intro')
    : '#/solve' + (slugs[method] ? '/' + slugs[method] : '');
}
