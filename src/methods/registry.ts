import type { MethodId } from '../core/types';
import type { MethodPresentation } from './contracts';
import { LBL_PRESENTATION } from './lbl/presentation';
import { CFOP_PRESENTATION } from './cfop/presentation';
import { ADVANCED_PRESENTATION } from './advanced/presentation';
export function getMethod(id: MethodId): MethodPresentation {
  if (id === 'lbl') return LBL_PRESENTATION;
  if (id === 'cfop-beginner') return CFOP_PRESENTATION;
  if (id === 'cfop-advanced') return ADVANCED_PRESENTATION;
  throw new Error(`Method ${id} is not registered.`);
}
