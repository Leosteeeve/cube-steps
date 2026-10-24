import { createTrialFor, reduceTrialFor } from '../../lab/trials/machine';
import type { RouxTrialConditions, RouxTrialState, RouxTrialEvent } from './types';
export { trialIsActive, TRIAL_HOLD_MS } from '../../lab/trials/machine';
export const createRouxTrial = (conditions: RouxTrialConditions, token = 0): RouxTrialState =>
  createTrialFor(conditions, token);
export const reduceRouxTrial = (state: RouxTrialState, event: RouxTrialEvent) =>
  reduceTrialFor(state, event);
