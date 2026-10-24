import { parseTrialDuration } from './parse-duration';
import type { TrialInterruption } from '../experiments/types';
import type {
  TrialConditions,
  TrialConditionsBase,
  TrialDraft,
  TrialEffect,
  TrialEvent,
  TrialState,
} from './types';
export const TRIAL_HOLD_MS = 300;
export function createTrialFor<C extends TrialConditionsBase>(
  conditions: C,
  token = 0,
): TrialState<C> {
  return {
    status: 'preparing',
    conditions: { ...conditions },
    setupConfirmed: false,
    holdConfirmed: false,
    token,
    inputLocked: false,
  };
}
export function trialIsActive(s: TrialState<TrialConditionsBase>) {
  return ['holding', 'ready', 'running'].includes(s.status);
}
export function reduceTrialFor<C extends TrialConditionsBase>(
  state: TrialState<C>,
  event: TrialEvent<C>,
): { state: TrialState<C>; effects: TrialEffect<C>[] } {
  const unchanged = () => ({ state, effects: [] as TrialEffect<C>[] });
  const review = (rawMs: number | null, reason: TrialInterruption | null = null) => {
    const draft: TrialDraft<C> = {
      ...state.conditions,
      rawMs,
      setupConfirmed: state.setupConfirmed,
      holdConfirmed: state.holdConfirmed,
      outcome: reason ? 'interrupted' : null,
      interruption: reason,
    };
    return {
      state: { ...state, status: 'review', draft, token: state.token + 1 } as TrialState<C>,
      effects: [{ type: reason ? 'interrupted' : 'draft', draft }] as TrialEffect<C>[],
    };
  };
  if ('now' in event && (!Number.isFinite(event.now) || event.now < 0)) return unchanged();
  if (event.type === 'lock') {
    if (event.locked && trialIsActive(state)) {
      const next = reduceTrialFor(state, { type: 'interrupt', now: event.now, reason: 'help' });
      return { ...next, state: { ...next.state, inputLocked: true } };
    }
    return { state: { ...state, inputLocked: event.locked }, effects: [] };
  }
  if (event.type === 'interrupt') {
    if (!trialIsActive(state)) return unchanged();
    const elapsed = state.status === 'running' ? Math.max(0, event.now - state.startedAt) : 0;
    return review(elapsed > 0 ? elapsed : null, event.reason);
  }
  if (event.type === 'next')
    return trialIsActive(state)
      ? unchanged()
      : {
          state: {
            ...createTrialFor(event.conditions ?? state.conditions, state.token + 1),
            inputLocked: state.inputLocked,
          },
          effects: [],
        };
  if (event.type === 'classify') {
    if (state.status !== 'review' || state.draft.interruption || event.outcome === 'interrupted')
      return unchanged();
    if (
      event.outcome === 'followed' &&
      state.conditions.kind === 'measured' &&
      (!state.draft.rawMs || !state.setupConfirmed || !state.holdConfirmed)
    )
      return unchanged();
    return { state: { ...state, draft: { ...state.draft, outcome: event.outcome } }, effects: [] };
  }
  if (state.inputLocked) return unchanged();
  if (event.type === 'confirm-setup' || event.type === 'confirm-hold') {
    if (state.status !== 'preparing') return unchanged();
    return {
      state: {
        ...state,
        [event.type === 'confirm-setup' ? 'setupConfirmed' : 'holdConfirmed']: event.value,
      },
      effects: [],
    };
  }
  if (event.type === 'manual') {
    if (state.status !== 'preparing' || state.conditions.timingMethod !== 'external-manual')
      return unchanged();
    if (!event.text.trim() && state.conditions.kind === 'warmup') return review(null);
    const parsed = parseTrialDuration(event.text);
    if (!parsed.ok) return { state: { ...state, issue: parsed.message }, effects: [] };
    if (!state.setupConfirmed || !state.holdConfirmed)
      return {
        state: { ...state, issue: 'Confirm the original cube and starting hold first.' },
        effects: [],
      };
    const result = review(parsed.ms);
    return { ...result, effects: [{ type: 'quiesce' }, ...result.effects] };
  }
  if (state.conditions.timingMethod === 'external-manual') return unchanged();
  if (event.type === 'press') {
    if (event.repeat) return unchanged();
    if (state.status === 'running')
      return event.now > state.startedAt ? review(event.now - state.startedAt) : unchanged();
    if (state.status === 'preparing' && state.setupConfirmed && state.holdConfirmed)
      return {
        state: {
          ...state,
          status: 'holding',
          pressedAt: event.now,
          token: state.token + 1,
          issue: undefined,
        },
        effects: [{ type: 'quiesce' }],
      };
  }
  if (
    event.type === 'arm' &&
    state.status === 'holding' &&
    event.token === state.token &&
    event.now - state.pressedAt >= TRIAL_HOLD_MS
  )
    return { state: { ...state, status: 'ready' }, effects: [{ type: 'quiesce' }] };
  if (event.type === 'release') {
    if (state.status === 'ready' && event.now - state.pressedAt >= TRIAL_HOLD_MS)
      return {
        state: { ...state, status: 'running', startedAt: event.now },
        effects: [{ type: 'quiesce' }],
      };
    if (state.status === 'holding')
      return { state: { ...state, status: 'preparing', token: state.token + 1 }, effects: [] };
  }
  if (event.type === 'stop' && state.status === 'running' && event.now > state.startedAt)
    return review(event.now - state.startedAt);
  return unchanged();
}
/** Keep the original CFOP entry points and literal endpoint intact. */
export const createTrial = (conditions: TrialConditions, token = 0): TrialState =>
  createTrialFor(conditions, token);
export const reduceTrial = (state: TrialState, event: TrialEvent) => reduceTrialFor(state, event);
