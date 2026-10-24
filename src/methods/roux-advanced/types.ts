import type { Color, CubeState, Face, SolveInput, TeachingMove } from '../../core/types';
import type { ActionInput } from '../shared/trace';
import type { Quarter } from '../roux/types';
export type { Quarter } from '../roux/types';
export type { RouxAssets } from '../roux/assets';
export type { FirstBlockEvidence } from './blocks/reference';
export type { BlockSearchAssets } from './blocks/distance';
export type RouxFrameId = `${'white' | 'yellow'}-${'blue' | 'green' | 'red' | 'orange'}`;
export interface RouxFrame {
  readonly id: RouxFrameId;
  readonly bottom: Color;
  readonly left: Color;
  readonly centers: Readonly<Record<Face, Color>>;
  readonly positioningMoves: readonly TeachingMove[];
}
export interface RouxFrameMap {
  readonly frame: RouxFrame;
  toCanonical(state: CubeState): CubeState;
  fromCanonical(state: CubeState): CubeState;
  toCanonicalMoves(moves: readonly TeachingMove[]): TeachingMove[];
  toPhysicalMoves(moves: readonly TeachingMove[]): TeachingMove[];
  toPhysicalId(id: string): string;
}
export interface RouxInput {
  readonly source: SolveInput;
  readonly initial: CubeState;
  readonly fingerprint: string;
  /** Facelet witnesses are derived from the verified complete baseline before publication. */
  readonly setupMoves: readonly TeachingMove[] | null;
}
export type AdvancedRouxStageId =
  'ar-position' | 'ar-first-block' | 'ar-second-block' | 'ar-cmll' | 'ar-eolr' | 'ar-last-four';
export interface AdvancedRouxActionMetadata {
  frameId: RouxFrameId;
  goal: string;
  protectedIds: readonly string[];
  protection: 'always' | 'endpoint';
  centerPhaseBefore: Quarter | null;
  centerPhaseAfter: Quarter;
  cornerOffsetBefore?: Quarter;
  cornerOffsetAfter?: Quarter;
  construction?: string;
}
export type AdvancedRouxActionDraft = ActionInput & { rouxAdvanced: AdvancedRouxActionMetadata };
export type RouxSearchMode = 'normal' | 'lab';
export type RouxStopReason =
  | 'complete'
  | 'time-limit'
  | 'work-limit'
  | 'frontier-limit'
  | 'memory-limit'
  | 'cancelled'
  | 'error';
export interface RouxBudgetSnapshot {
  operations: number;
  elapsedMs: number;
  entries: number;
  retainedBytes: number;
  reason?: RouxStopReason;
}
export interface RouxSearchBudget {
  charge(kind: 'expand' | 'simulate' | 'score', n?: number): void;
  checkpoint(): void;
  remaining(): { operations: number; milliseconds: number };
  retain(key: string, bytes: number): void;
  release(key: string): void;
  snapshot(): RouxBudgetSnapshot;
}
