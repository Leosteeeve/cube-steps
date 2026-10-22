import type { CubeState, SolveFailure } from '../../core/types';
import type { ActionInput } from '../shared/trace';

export type RouxStageId =
  | 'roux-frame'
  | 'roux-first-block'
  | 'roux-second-block'
  | 'roux-corner-orientation'
  | 'roux-corner-permutation'
  | 'roux-edge-orientation'
  | 'roux-left-right-edges'
  | 'roux-last-four-edges';
export type Quarter = 0 | 1 | 2 | 3;
export interface RouxActionMetadata {
  goal: string;
  protectedIds: readonly string[];
  protection: 'always' | 'endpoint';
  centerPhaseBefore: Quarter | null;
  centerPhaseAfter: Quarter;
  cornerOffsetBefore?: Quarter;
  cornerOffsetAfter?: Quarter;
  temporaryNote?: string;
}
export type RouxActionDraft = ActionInput & { roux: RouxActionMetadata };
export type RouxPlanResult =
  | { ok: true; state: CubeState; actions: RouxActionDraft[] }
  | { ok: false; code: SolveFailure['code']; stageId: RouxStageId; message: string };
