import type { MethodId } from '../core/types';
import type { Lesson } from './course-types';
import { LBL_COURSE } from './lbl-course';
import { CFOP_COURSE } from './cfop-course';
import { ADVANCED_COURSE } from './advanced-course';
let rouxCourse: readonly Lesson[] | undefined;
let advancedRouxCourse: readonly Lesson[] | undefined;
export function registerAdvancedRouxCourse(course: readonly Lesson[]) {
  if (advancedRouxCourse && advancedRouxCourse !== course)
    throw Error('Advanced Roux course already registered.');
  advancedRouxCourse = course;
}
export function registerRouxCourse(course: readonly Lesson[]) {
  if (rouxCourse && rouxCourse !== course) throw Error('Roux course already registered.');
  rouxCourse = course;
}
export function getCourse(method: MethodId): readonly Lesson[] {
  if (method === 'lbl') return LBL_COURSE;
  if (method === 'cfop-beginner') return CFOP_COURSE;
  if (method === 'cfop-advanced') return ADVANCED_COURSE;
  if (method === 'roux-beginner' && rouxCourse) return rouxCourse;
  if (method === 'roux-advanced' && advancedRouxCourse) return advancedRouxCourse;
  throw new Error('Unknown course method.');
}
