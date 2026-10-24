import type {
  TrialConditionsBase,
  TrialDraft,
  TrialEffect,
  TrialEvent,
  TrialMemory,
  TrialState,
} from '../../lab/trials/types';
export type RouxTrialConditions = Omit<TrialConditionsBase, 'endpoint' | 'method'> & {
  endpoint: 'roux-blocks';
  method: 'roux-advanced';
};
export type RouxTrialState = TrialState<RouxTrialConditions>;
export type RouxTrialDraft = TrialDraft<RouxTrialConditions>;
export type RouxTrialEffect = TrialEffect<RouxTrialConditions>;
export type RouxTrialEvent = TrialEvent<RouxTrialConditions>;
export type RouxTrialMemory = TrialMemory<RouxTrialConditions>;
