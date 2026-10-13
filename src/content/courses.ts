import type { MethodId } from '../core/types';
import type { Lesson } from './course-types';
import { LBL_COURSE } from './lbl-course';
import { CFOP_COURSE } from './cfop-course';
import { ADVANCED_COURSE } from './advanced-course';
export function getCourse(method: MethodId): readonly Lesson[] {
  if (method === 'lbl') return LBL_COURSE;
  if (method === 'cfop-beginner') return CFOP_COURSE;
  if (method === 'cfop-advanced') return ADVANCED_COURSE;
  throw new Error('Unknown course method.');
}
