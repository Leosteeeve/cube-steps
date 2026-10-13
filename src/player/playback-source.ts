import type { SolveSession, StageId } from '../core/types';
import type { AlgorithmDemonstration } from '../algorithms/demonstration';
export type PlaybackSource =
  | { kind: 'solve'; session: SolveSession }
  | { kind: 'algorithm'; demonstration: AlgorithmDemonstration };
export type PlaybackSectionId = StageId | 'algorithm-setup' | 'algorithm-formula';
