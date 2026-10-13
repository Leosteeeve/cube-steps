import type { CubeState } from '../../../core/types';
import type { ActionInput } from '../../shared/trace';
export interface F2LTarget {
  cornerId: string;
  edgeId: string;
  slot: 'FR' | 'FL' | 'BR' | 'BL';
}
export interface F2LLimits {
  maxPreparationStates: number;
  maxExtractionMacros: number;
  maxCandidatesPerTarget: number;
  maxSimulations: number;
}
export const DEFAULT_F2L_LIMITS: F2LLimits = {
  maxPreparationStates: 1024,
  maxExtractionMacros: 2,
  maxCandidatesPerTarget: 1024,
  maxSimulations: 262144,
};
export interface F2LPreparation {
  actions: ActionInput[];
  state: CubeState;
}
