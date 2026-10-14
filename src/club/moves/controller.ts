import type { NotationDemo } from './demonstration';
export type NotationPhase = 'loading' | 'ready' | 'playing' | 'paused' | 'complete' | 'error';
export interface NotationSnapshot {
  version: number;
  demo: NotationDemo;
  phase: NotationPhase;
  progress: number;
  speed: 0.5 | 1;
  reducedMotion: boolean;
  error: string | null;
}
export interface AnimationClock {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
}
const browserClock: AnimationClock = {
  now: () => performance.now(),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};
export function createNotationController(
  initial: NotationDemo,
  clock: AnimationClock = browserClock,
) {
  let state: NotationSnapshot = {
    version: 1,
    demo: initial,
    phase: 'loading',
    progress: 0,
    speed: 1,
    reducedMotion: false,
    error: null,
  };
  let duration = 0,
    frame: number | undefined,
    generation = 0,
    last = 0,
    disposed = false;
  const listeners = new Set<(value: NotationSnapshot) => void>();
  const emit = () => {
    if (!disposed) listeners.forEach((listener) => listener(state));
  };
  const cancel = () => {
    generation++;
    if (frame !== undefined) clock.cancel(frame);
    frame = undefined;
  };
  const position = () =>
    Math.min(1, state.progress + (Math.max(0, clock.now() - last) * state.speed) / duration);
  const updatePosition = () => {
    if (state.phase === 'playing') {
      state = { ...state, progress: position() };
      last = clock.now();
      if (state.progress === 1) {
        state = { ...state, phase: 'complete' };
        cancel();
      }
    }
  };
  const pause = () => {
    if (disposed || state.phase !== 'playing') return;
    updatePosition();
    cancel();
    if (state.phase === 'playing') state = { ...state, phase: 'paused' };
    emit();
  };
  const play = () => {
    if (
      disposed ||
      state.reducedMotion ||
      !duration ||
      !['ready', 'paused'].includes(state.phase) ||
      state.progress >= 1
    )
      return;
    cancel();
    const epoch = generation;
    last = clock.now();
    state = { ...state, phase: 'playing' };
    emit();
    const tick = () => {
      if (disposed || epoch !== generation || state.phase !== 'playing') return;
      frame = undefined;
      updatePosition();
      emit();
      if (!disposed && epoch === generation && state.phase === 'playing')
        frame = clock.request(tick);
    };
    frame = clock.request(tick);
  };
  const reset = () => {
    if (disposed) return;
    cancel();
    state = {
      ...state,
      progress: 0,
      phase: state.error ? 'error' : duration ? 'ready' : 'loading',
    };
    emit();
  };
  const fail = (version: number, message: string) => {
    if (disposed || version !== state.version) return;
    cancel();
    duration = 0;
    state = { ...state, phase: 'error', progress: 0, error: message };
    emit();
  };
  return {
    snapshot: () => state,
    select(demo: NotationDemo) {
      if (disposed) return state.version;
      cancel();
      duration = 0;
      state = {
        ...state,
        version: state.version + 1,
        demo,
        phase: 'loading',
        progress: 0,
        error: null,
      };
      emit();
      return state.version;
    },
    ready(version: number, durationMs: number) {
      if (disposed || version !== state.version || state.phase !== 'loading') return;
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        fail(version, 'The move timing could not be loaded. Please retry.');
        return;
      }
      duration = durationMs;
      state = { ...state, phase: 'ready' };
      emit();
    },
    fail,
    play,
    pause,
    reset,
    restorePaused(position: { progress: number; speed: 0.5 | 1 }) {
      if (disposed || state.phase === 'loading' || state.error) return;
      cancel();
      const requested = Number.isFinite(position.progress)
        ? Math.min(1, Math.max(0, position.progress))
        : 0;
      const progress = state.reducedMotion && requested < 1 ? 0 : requested;
      state = {
        ...state,
        progress,
        speed: position.speed === 0.5 ? 0.5 : 1,
        phase: progress === 1 ? 'complete' : progress === 0 ? 'ready' : 'paused',
      };
      emit();
    },
    replay() {
      if (disposed || state.reducedMotion || !duration || state.error) return;
      reset();
      play();
    },
    setSpeed(speed: 0.5 | 1) {
      if (disposed || ![0.5, 1].includes(speed)) return;
      updatePosition();
      state = { ...state, speed };
      emit();
    },
    setReducedMotion(enabled: boolean) {
      if (disposed || state.reducedMotion === enabled) return;
      if (enabled) {
        cancel();
        if (state.progress < 1)
          state = {
            ...state,
            progress: 0,
            phase: state.error ? 'error' : duration ? 'ready' : 'loading',
          };
      }
      state = { ...state, reducedMotion: enabled };
      emit();
    },
    showEndpoint(endpoint: 'before' | 'after') {
      if (disposed || state.phase === 'loading' || (!state.reducedMotion && !state.error)) return;
      cancel();
      const progress = endpoint === 'after' ? 1 : 0;
      state = {
        ...state,
        progress,
        phase: state.error ? 'error' : progress ? 'complete' : 'ready',
      };
      emit();
    },
    subscribe(listener: (value: NotationSnapshot) => void) {
      if (disposed) return () => {};
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      listeners.clear();
    },
  };
}
