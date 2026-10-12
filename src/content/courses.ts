import type { MethodId } from '../core/types';
import type { Lesson } from './course-types';
import { LBL_COURSE } from './lbl-course';
import { CFOP_COURSE } from './cfop-course';
export function getCourse(method: MethodId): readonly Lesson[] { return method === 'lbl' ? LBL_COURSE : CFOP_COURSE; }
