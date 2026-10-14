import type { TOURS } from './catalog';
import type { GuidanceAction, TourId, TourSnapshot, TutorialPreferences } from './types';
export function createTourController(catalog: typeof TOURS, initial: TutorialPreferences) {
  let state: TourSnapshot = { run: null, preferences: initial },
    token = 0,
    disposed = false;
  const listeners = new Set<(s: TourSnapshot) => void>();
  const notify = () => {
    if (!disposed) for (const listener of listeners) listener(state);
  };
  const preferences = (value: TutorialPreferences) => {
    state = { ...state, preferences: value };
  };
  function position(id: TourId, stepId: string) {
    const prior = state.preferences.tours[id];
    preferences({
      ...state.preferences,
      tours: {
        ...state.preferences.tours,
        [id]: {
          contentVersion: catalog[id].contentVersion,
          nextStepId: stepId,
          completed: prior?.completed ?? false,
        },
      },
    });
    state = { ...state, run: { tourId: id, stepId, token: ++token, status: 'waiting' } };
    notify();
  }
  function move(offset: number, skip = false) {
    const run = state.run;
    if (!run || disposed) return;
    const tour = catalog[run.tourId],
      index = tour.steps.findIndex((s) => s.id === run.stepId),
      step = tour.steps[index];
    if (offset > 0 && !skip && step.action && run.status !== 'done') return;
    if (index + offset < 0) return;
    if (index + offset >= tour.steps.length) {
      preferences({
        ...state.preferences,
        dismissed: { ...state.preferences.dismissed, [tour.id]: tour.contentVersion },
        tours: {
          ...state.preferences.tours,
          [tour.id]: { contentVersion: tour.contentVersion, completed: true },
        },
      });
      state = { ...state, run: null };
      ++token;
      notify();
    } else position(tour.id, tour.steps[index + offset].id);
  }
  return {
    snapshot: () => state,
    start(id: TourId, mode: 'start' | 'resume' | 'restart') {
      if (disposed) return;
      const tour = catalog[id],
        saved = state.preferences.tours[id];
      const resume =
        mode === 'resume' &&
        saved?.contentVersion === tour.contentVersion &&
        tour.steps.some((s) => s.id === saved.nextStepId);
      preferences({
        ...state.preferences,
        welcome: state.preferences.welcome === 'never' ? 'never' : 'started',
        dismissed: { ...state.preferences.dismissed, [id]: tour.contentVersion },
      });
      position(id, resume ? saved!.nextStepId! : tour.steps[0].id);
    },
    target(current: number, status: 'waiting' | 'ready' | 'unavailable') {
      const run = state.run;
      if (
        !run ||
        run.token !== current ||
        disposed ||
        run.status === status ||
        (run.status === 'done' && status === 'ready')
      )
        return;
      state = { ...state, run: { ...run, status } };
      notify();
    },
    action(current: number, value: GuidanceAction) {
      const run = state.run;
      if (!run || run.token !== current || run.status !== 'ready' || disposed) return;
      const action = catalog[run.tourId].steps.find((s) => s.id === run.stepId)?.action;
      if (!action || action.name !== value.name || action.value !== value.value) return;
      state = { ...state, run: { ...run, status: 'done' } };
      notify();
    },
    setWelcome(value: TutorialPreferences['welcome']) {
      preferences({ ...state.preferences, welcome: value });
      notify();
    },
    dismiss(id: TourId) {
      preferences({
        ...state.preferences,
        dismissed: { ...state.preferences.dismissed, [id]: catalog[id].contentVersion },
      });
      notify();
    },
    resetPreferences(value: TutorialPreferences) {
      state = { run: null, preferences: value };
      ++token;
      notify();
    },
    next: () => move(1),
    back: () => move(-1),
    skip: () => move(1, true),
    exit() {
      if (!state.run) return;
      state = { ...state, run: null };
      ++token;
      notify();
    },
    subscribe(listener: (s: TourSnapshot) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      ++token;
      listeners.clear();
    },
  };
}
