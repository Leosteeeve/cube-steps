import type { Color, CubeObservation, TeachingMove } from '../../core/types';
import type { F2LTarget } from '../../methods/advanced/f2l/types';
import type { LabScore } from '../types';
export type { LabScore, LabExecutionEvent } from '../types';
export type GripId = string;
export interface GripPose {
  id: GripId;
  leftWrist: -1 | 0 | 1;
  rightWrist: -1 | 0 | 1;
  leftThumb: string;
  rightThumb: string;
  support: 'both';
}
export interface GripTransition {
  from: GripId;
  to: GripId;
  instruction: string;
  awkward: 'none' | 'finger' | 'grip' | 'view';
}
export interface ExecutionProfile {
  id: string;
  move: TeachingMove;
  transitions: GripTransition[];
  provenance: string;
}
export interface FormulaProfile {
  moves: TeachingMove[];
  rationale: string;
  recognition: 'sticker-directions' | 'connected-pair';
  provenance: string;
}
export interface ExecutionCatalog {
  version: 'lab-execution-v1';
  neutralGrip: GripId;
  poses: Record<GripId, GripPose>;
  tokens: Partial<Record<TeachingMove, ExecutionProfile>>;
  formulas: Record<string, FormulaProfile>;
}
export interface RecognitionCheckpoint {
  observation: CubeObservation;
  target: F2LTarget;
  bottomColor: Color;
  mode: 'sticker-directions' | 'connected-pair';
}
export interface ExecutionSegment {
  phase: 'position' | 'cross' | 'f2l' | 'last-layer';
  moves: readonly TeachingMove[];
  algorithmId?: string;
  recognition?: RecognitionCheckpoint;
}
export type RatedLabScore = Extract<LabScore, { rated: true }>;
export interface ExecutionPath {
  terminalGrip: GripId;
  score: RatedLabScore;
  nextBoundary: number;
}
