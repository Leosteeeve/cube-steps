import type { Interruption, Penalty, PreparedScramble, TimerAttempt, TimerSettings } from './types';
export type InputToken = 'keyboard' | `pointer:${number}`;
type Base = { settings: TimerSettings; nowMs: number; lastAttempt?: TimerAttempt };
export type TimerState = Base &
  (
    | { phase: 'loading' }
    | { phase: 'error'; message: string }
    | { phase: 'idle'; prepared: PreparedScramble }
    | { phase: 'inspection'; prepared: PreparedScramble; inspectionStartedAt: number }
    | {
        phase: 'arming';
        prepared: PreparedScramble;
        token: InputToken;
        armedAt: number;
        inspectionStartedAt: number | null;
        beginInspection: boolean;
      }
    | {
        phase: 'running';
        prepared: PreparedScramble;
        solveStartedAt: number;
        inspectionMs: number | null;
        inspectionPenalty: Penalty;
      }
    | { phase: 'stopped'; prepared: PreparedScramble; stopToken: InputToken }
  );
export type TimerInput =
  | { type: 'scramble-ready'; prepared: PreparedScramble }
  | { type: 'scramble-error'; message: string }
  | { type: 'scramble-loading' }
  | { type: 'settings'; settings: TimerSettings }
  | { type: 'down' | 'up'; token: InputToken; repeat?: boolean }
  | { type: 'tick' }
  | { type: Interruption };
export type TimerEvent = TimerInput & { atMs: number; wallTime: string };
export type TimerEffect = { type: 'record'; attempt: TimerAttempt } | { type: 'next-scramble' };
export const createTimerState = (settings: TimerSettings): TimerState => ({
  phase: 'loading',
  settings,
  nowMs: 0,
});
export function transitionTimer(
  state: TimerState,
  event: TimerEvent,
): { state: TimerState; effects: TimerEffect[] } {
  const base: Base = {
    settings: state.settings,
    nowMs: event.atMs,
    lastAttempt: state.lastAttempt,
  };
  const result = (next: TimerState = state, effects: TimerEffect[] = []) => ({
    state: next,
    effects,
  });
  const nextScramble = (): { state: TimerState; effects: TimerEffect[] } =>
    result({ ...base, phase: 'loading' }, [{ type: 'next-scramble' }]);
  const finish = (interruption: Interruption | null): TimerAttempt => {
    if (state.phase !== 'running') throw new Error('Only a running timer can finish.');
    return Object.freeze({
      version: 1,
      id: state.prepared.id,
      createdAt: event.wallTime,
      rawMs: Math.max(0, event.atMs - state.solveStartedAt),
      scramble: state.prepared.text,
      inspectionMs: state.inspectionMs,
      inspectionPenalty: state.inspectionPenalty,
      manualPenalty: 'none',
      interruption,
      revision: 0,
      deletedAt: null,
    });
  };
  if (event.type === 'settings') return result({ ...state, settings: event.settings });
  if (event.type === 'tick') return result({ ...state, nowMs: event.atMs });
  if (['escape', 'blur', 'hidden', 'leave', 'pointer-cancel'].includes(event.type)) {
    if (state.phase === 'running') {
      const attempt = finish(event.type as Interruption);
      return result({ ...base, phase: 'loading', lastAttempt: attempt }, [
        { type: 'record', attempt },
        { type: 'next-scramble' },
      ]);
    }
    if (state.phase === 'stopped') return nextScramble();
    if (state.phase === 'arming' || state.phase === 'inspection')
      return result({ ...base, phase: 'idle', prepared: state.prepared });
    return result();
  }
  if (event.type === 'scramble-loading') {
    return ['idle', 'error', 'loading'].includes(state.phase)
      ? result({ ...base, phase: 'loading' })
      : result();
  }
  if (event.type === 'scramble-ready') {
    return ['error', 'loading'].includes(state.phase) && event.prepared.id !== state.lastAttempt?.id
      ? result({ ...base, phase: 'idle', prepared: event.prepared })
      : result();
  }
  if (event.type === 'scramble-error')
    return ['error', 'loading'].includes(state.phase)
      ? result({ ...base, phase: 'error', message: event.message })
      : result();
  if (event.type === 'down' && !event.repeat) {
    if (state.phase === 'idle' || state.phase === 'inspection')
      return result({
        ...base,
        phase: 'arming',
        prepared: state.prepared,
        token: event.token,
        armedAt: event.atMs,
        inspectionStartedAt: state.phase === 'inspection' ? state.inspectionStartedAt : null,
        beginInspection: state.phase === 'idle' && state.settings.inspectionEnabled,
      });
    if (state.phase === 'running') {
      const attempt = finish(null);
      return result(
        {
          ...base,
          phase: 'stopped',
          prepared: state.prepared,
          stopToken: event.token,
          lastAttempt: attempt,
        },
        [{ type: 'record', attempt }],
      );
    }
  }
  if (event.type === 'up') {
    if (state.phase === 'stopped' && state.stopToken === event.token) return nextScramble();
    if (state.phase === 'arming' && state.token === event.token) {
      if (state.beginInspection)
        return result({
          ...base,
          phase: 'inspection',
          prepared: state.prepared,
          inspectionStartedAt: event.atMs,
        });
      if (event.atMs - state.armedAt < 300)
        return result(
          state.inspectionStartedAt === null
            ? { ...base, phase: 'idle', prepared: state.prepared }
            : {
                ...base,
                phase: 'inspection',
                prepared: state.prepared,
                inspectionStartedAt: state.inspectionStartedAt,
              },
        );
      const inspectionMs =
        state.inspectionStartedAt === null
          ? null
          : Math.max(0, event.atMs - state.inspectionStartedAt);
      return result({
        ...base,
        phase: 'running',
        prepared: state.prepared,
        solveStartedAt: event.atMs,
        inspectionMs,
        inspectionPenalty:
          inspectionMs === null || inspectionMs < 15000
            ? 'none'
            : inspectionMs < 17000
              ? 'plus2'
              : 'dnf',
      });
    }
  }
  return result();
}
