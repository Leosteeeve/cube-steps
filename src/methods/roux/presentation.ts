import type { MethodPresentation } from '../contracts';
import { ROUX_STAGES } from './stages';
import { ROUX_BLOCK_ALGORITHMS } from './blocks/catalog';
import { ROUX_CORNER_ALGORITHMS } from './corners/catalog';
import { ROUX_LSE_ALGORITHMS } from './lse/catalog';
export const ROUX_PRESENTATION: MethodPresentation = {
  id: 'roux-beginner',
  label: 'Beginner Roux',
  teachingStatus: 'preview',
  stages: ROUX_STAGES,
  algorithms: { ...ROUX_BLOCK_ALGORITHMS, ...ROUX_CORNER_ALGORITHMS, ...ROUX_LSE_ALGORITHMS },
};
