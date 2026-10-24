import type { CubeState, TeachingMove } from '../../../core/types';
export interface RouxExecutionEvent {
  boundary: number;
  kind: 'turn' | 'rotation' | 'regrip' | 'visibility' | 'awkward';
  profileId: string;
  fromGrip: string;
  toGrip: string;
  instruction: string;
}
export type RouxExecutionScore =
  | { rated: false; reason: string }
  | {
      rated: true;
      modelVersion: 'roux-execution-v1';
      T: number;
      R: number;
      G: number;
      V: number;
      A: number;
      cost: number;
      events: readonly RouxExecutionEvent[];
    };
export interface RouxExecutionSegment {
  moves: readonly TeachingMove[];
  phase: 'position' | 'blocks' | 'corners-edges';
  targets: readonly string[];
  before: CubeState;
  algorithmId?: string;
}
export interface RouxGrip {
  id: string;
  description: string;
}
export interface RouxExecutionProfile {
  id: string;
  moves: readonly TeachingMove[];
  entryGrip: string;
  exitGrip: string;
  events: readonly RouxExecutionEvent[];
  sourceRefs: readonly string[];
  rationale: string;
}
export interface RouxExecutionCatalog {
  version: 'roux-execution-v1';
  neutralGrip: string;
  grips: readonly RouxGrip[];
  profiles: readonly RouxExecutionProfile[];
}
