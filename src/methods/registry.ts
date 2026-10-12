import type { MethodId } from '../core/types';
import type { MethodPresentation } from './contracts';
import { LBL_PRESENTATION } from './lbl/presentation';
export function getMethod(id: MethodId): MethodPresentation {
  if (id === 'lbl') return LBL_PRESENTATION;
  throw new Error(`Method ${id} is not registered.`);
}
