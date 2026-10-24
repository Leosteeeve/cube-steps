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
export type TrialConditionsBase = Omit<TrialConditions, 'endpoint'> & {
  endpoint: 'cross-f2l' | 'roux-blocks';
  method?: 'roux-advanced';
};
export type TrialAttemptBase = Omit<LabAttempt, 'endpoint'> & {
  endpoint: TrialConditionsBase['endpoint'];
  method?: 'roux-advanced';
};
export type TrialDraft<C extends TrialConditionsBase = TrialConditions> = C & {
  rawMs: number | null;
  setupConfirmed: boolean;
  holdConfirmed: boolean;
  outcome: LabAttempt['outcome'] | null;
  interruption: TrialInterruption | null;
  flow?: number;
  recognition?: number;
  note?: string;
};
interface Base<C extends TrialConditionsBase> {
  conditions: C;
  setupConfirmed: boolean;
  holdConfirmed: boolean;
  token: number;
  inputLocked: boolean;
  issue?: string;
}
export type TrialState<C extends TrialConditionsBase = TrialConditions> = Base<C> &
  (
    | { status: 'preparing' }
    | { status: 'holding' | 'ready'; pressedAt: number }
    | { status: 'running'; startedAt: number }
    | { status: 'review'; draft: TrialDraft<C> }
  );
export type TrialEvent<C extends TrialConditionsBase = TrialConditions> =
  | { type: 'confirm-setup' | 'confirm-hold'; value: boolean }
  | { type: 'press'; now: number; repeat?: boolean }
  | { type: 'release' | 'stop'; now: number }
  | { type: 'arm'; now: number; token: number }
  | { type: 'interrupt'; now: number; reason: TrialInterruption }
  | { type: 'lock'; locked: boolean; now: number }
  | { type: 'manual'; text: string }
  | { type: 'classify'; outcome: LabAttempt['outcome'] }
  | { type: 'next'; conditions?: C };
export type TrialEffect<C extends TrialConditionsBase = TrialConditions> =
  | { type: 'quiesce' }
  | { type: 'draft'; draft: TrialDraft<C> }
  | { type: 'interrupted'; draft: TrialDraft<C> };
export interface TrialMemory<C extends TrialConditionsBase = TrialConditions> {
  current: TrialState<C> | null;
  draftId?: string;
  createdAt?: string;
}
