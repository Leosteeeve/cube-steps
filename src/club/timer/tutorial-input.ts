import type { InputToken, TimerInput, TimerState } from './machine';
import type { RepositorySnapshot } from './repository';
export function timerTutorialAllowed(state: TimerState, history: RepositorySnapshot): boolean {
  return state.phase === 'idle' && history.pendingIds.length === 0 && !history.error;
}
export function createTutorialInputGate() {
  let locked = false,
    barrier = false,
    disposed = false;
  const held = new Set<InputToken>(),
    suppressedReleases = new Set<InputToken>();
  function observe(token: InputToken, down: boolean) {
    if (disposed) return;
    if (down) {
      held.add(token);
      suppressedReleases.delete(token);
    } else {
      if (locked || barrier) suppressedReleases.add(token);
      held.delete(token);
      if (!held.size && !locked) barrier = false;
    }
  }
  return {
    setLocked(value: boolean) {
      if (disposed) return;
      locked = value;
      if (value || held.size) barrier = true;
      else barrier = false;
    },
    allow(input: TimerInput): boolean {
      if (disposed || locked || barrier) return false;
      if (input.type === 'down' && input.repeat) return false;
      if (input.type === 'up' && suppressedReleases.has(input.token)) {
        suppressedReleases.delete(input.token);
        return false;
      }
      return true;
    },
    observeKey(event: { type: 'keydown' | 'keyup'; code: string; repeat: boolean }) {
      if (event.code === 'Space') observe('keyboard', event.type === 'keydown');
    },
    observePointer(event: {
      type: 'pointerdown' | 'pointerup' | 'pointercancel';
      pointerId: number;
    }) {
      observe(`pointer:${event.pointerId}`, event.type === 'pointerdown');
    },
    releaseHeld() {
      held.clear();
      suppressedReleases.clear();
      barrier = locked;
    },
    dispose() {
      disposed = true;
      held.clear();
      suppressedReleases.clear();
    },
  };
}
export type TutorialInputGate = ReturnType<typeof createTutorialInputGate>;
