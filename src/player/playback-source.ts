import type { SolveSession, StageId } from '../core/types';
import type { AlgorithmDemonstration } from '../algorithms/demonstration';
import type { LabPlaybackData } from '../lab/playback';
import type { LabSectionId } from '../lab/types';
export type PlaybackSource =
  | { kind: 'solve'; session: SolveSession }
  | { kind: 'algorithm'; demonstration: AlgorithmDemonstration }
  | { kind: 'lab'; prepared: LabPlaybackData };
export type PlaybackSectionId = StageId | 'algorithm-setup' | 'algorithm-formula' | LabSectionId;
