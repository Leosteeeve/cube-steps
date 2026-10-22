import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
export interface BlockGoal {
  side: 'left' | 'right';
  phase: 'base' | 'pair';
  targetIds: readonly string[];
  lockedIds: readonly string[];
}
export interface BlockMatch {
  caseId: string;
  targets: string[];
  recognition: string;
  explanation: string;
}
export interface BlockManeuver {
  id: string;
  kind: 'setup' | 'algorithm';
  moves: TeachingMove[];
  algorithmId?: string;
  protection: 'always' | 'endpoint';
  match(engine: CubeEngine, state: CubeState, goal: BlockGoal): BlockMatch | null;
  check(engine: CubeEngine, before: CubeState, after: CubeState, goal: BlockGoal): boolean;
}
export interface BlockPolicy {
  key: string;
  goal: BlockGoal;
  rank: number[];
  cost: number[];
  expected: number;
  covered: number;
  allowed: string[];
}
export interface RouxBlockPolicies {
  version: 1;
  catalogDigest: string;
  tables: BlockPolicy[];
}
