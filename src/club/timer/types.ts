import type { CubeState, FaceletSnapshot } from '../../core/types';
export type Penalty = 'none' | 'plus2' | 'dnf';
export type Interruption = 'escape' | 'blur' | 'hidden' | 'leave' | 'pointer-cancel';
export interface TimerAttempt {
  version: 1;
  id: string;
  createdAt: string;
  rawMs: number;
  scramble: string;
  inspectionMs: number | null;
  inspectionPenalty: Penalty;
  manualPenalty: Penalty;
  interruption: Interruption | null;
  revision: number;
  deletedAt: string | null;
}
export interface TimerSettings {
  version: 1;
  inspectionEnabled: boolean;
}
export interface PreparedScramble {
  id: string;
  text: string;
  state: CubeState;
  facelets: FaceletSnapshot;
}
export type TimerResult = { kind: 'time'; ms: number } | { kind: 'dnf' } | { kind: 'insufficient' };
