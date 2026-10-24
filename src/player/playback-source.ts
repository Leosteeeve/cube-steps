import type { SolveSession, StageId } from '../core/types';
import type { AlgorithmDemonstration } from '../algorithms/demonstration';
import type { LabPlaybackData } from '../lab/playback';
import type { LabSectionId } from '../lab/types';
export interface PreparedTeachingPlayback {
  timeline: import('./playback-timeline').PlaybackTimeline;
  setup: readonly import('../core/types').TeachingMove[];
  algorithms: Readonly<Record<string, import('../methods/contracts').TeachingAlgorithm>>;
  label: string;
}
export type PlaybackSource =
  | { kind: 'solve'; session: SolveSession }
  | { kind: 'algorithm'; demonstration: AlgorithmDemonstration }
  | { kind: 'lab'; prepared: LabPlaybackData }
  | { kind: 'cmll'; prepared: PreparedTeachingPlayback }
  | { kind: 'roux-lesson'; prepared: PreparedTeachingPlayback }
  | {
      kind: 'roux-lab';
      prepared: ReturnType<typeof import('../roux-lab/playback').prepareRouxPlayback>;
    };
export type PlaybackSectionId =
  StageId | 'algorithm-setup' | 'algorithm-formula' | 'cmll-setup' | 'cmll-formula' | LabSectionId;
