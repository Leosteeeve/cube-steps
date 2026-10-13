import type { CubeEngine } from '../../core/types';
import { generateScramble } from '../../core/scramble';
import { createTimerState, transitionTimer, type TimerInput, type TimerState } from './machine';
import { prepareTimerScramble } from './scramble';
import type { TimerRepository } from './repository';
import type { TimerSettings } from './types';
export interface TimerController {
  snapshot(): TimerState;
  subscribe(listener: (state: TimerState) => void): () => void;
  dispatch(input: TimerInput): void;
  newScramble(): Promise<void>;
  setInspection(enabled: boolean): void;
  dispose(): void;
}
export function createTimerController({
  engine,
  repository,
  settings,
  generate = generateScramble,
  clock = { now: () => performance.now(), iso: () => new Date().toISOString() },
}: {
  engine: CubeEngine;
  repository: TimerRepository;
  settings: TimerSettings;
  generate?: () => Promise<string>;
  clock?: { now(): number; iso(): string };
}): TimerController {
  let state = createTimerState(settings),
    epoch = 0,
    disposed = false;
  const listeners = new Set<(state: TimerState) => void>();
  function dispatch(input: TimerInput) {
    if (disposed) return;
    const next = transitionTimer(state, { ...input, atMs: clock.now(), wallTime: clock.iso() });
    state = next.state;
    listeners.forEach((l) => l(state));
    for (const effect of next.effects) {
      if (effect.type === 'record') void repository.record(effect.attempt);
      else if (input.type !== 'leave') void newScramble();
    }
  }
  async function newScramble() {
    if (disposed || !['loading', 'idle', 'error'].includes(state.phase)) return;
    const request = ++epoch;
    dispatch({ type: 'scramble-loading' });
    try {
      const text = await generate();
      if (disposed || request !== epoch) return;
      const prepared = prepareTimerScramble(engine, text, crypto.randomUUID());
      dispatch({ type: 'scramble-ready', prepared });
    } catch (e) {
      if (!disposed && request === epoch)
        dispatch({
          type: 'scramble-error',
          message: e instanceof Error ? e.message : 'Could not generate a scramble.',
        });
    }
  }
  return {
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch,
    newScramble,
    setInspection(enabled) {
      dispatch({ type: 'settings', settings: { version: 1, inspectionEnabled: enabled } });
    },
    dispose() {
      if (disposed) return;
      dispatch({ type: 'leave' });
      disposed = true;
      ++epoch;
      listeners.clear();
    },
  };
}
