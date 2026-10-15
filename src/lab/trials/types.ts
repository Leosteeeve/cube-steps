import type { LabAttempt, TrialInterruption } from '../experiments/types';
export type TrialConditions = Pick<
  LabAttempt,
  | 'experimentId'
  | 'routeId'
  | 'comparisonId'
  | 'blockId'
  | 'slot'
  | 'retryOf'
  | 'testerId'
  | 'timingMethod'
  | 'endpoint'
  | 'kind'
  | 'intendedOrder'
  | 'actualOrder'
>;
export type TrialDraft = TrialConditions & {
  rawMs: number | null;
  setupConfirmed: boolean;
  holdConfirmed: boolean;
  outcome: LabAttempt['outcome'] | null;
  interruption: TrialInterruption | null;
  flow?: number;
  recognition?: number;
  note?: string;
};
interface Base {
  conditions: TrialConditions;
  setupConfirmed: boolean;
  holdConfirmed: boolean;
  token: number;
  inputLocked: boolean;
  issue?: string;
}
export type TrialState = Base &
  (
    | { status: 'preparing' }
    | { status: 'holding' | 'ready'; pressedAt: number }
    | { status: 'running'; startedAt: number }
    | { status: 'review'; draft: TrialDraft }
  );
export type TrialEvent =
  | { type: 'confirm-setup' | 'confirm-hold'; value: boolean }
  | { type: 'press'; now: number; repeat?: boolean }
  | { type: 'release' | 'stop'; now: number }
  | { type: 'arm'; now: number; token: number }
  | { type: 'interrupt'; now: number; reason: TrialInterruption }
  | { type: 'lock'; locked: boolean; now: number }
  | { type: 'manual'; text: string }
  | { type: 'classify'; outcome: LabAttempt['outcome'] }
  | { type: 'next'; conditions?: TrialConditions };
export type TrialEffect =
  | { type: 'quiesce' }
  | { type: 'draft'; draft: TrialDraft }
  | { type: 'interrupted'; draft: TrialDraft };
export interface TrialMemory {
  current: TrialState | null;
  draftId?: string;
  createdAt?: string;
}
