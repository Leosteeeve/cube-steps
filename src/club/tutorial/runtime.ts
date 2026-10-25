import type { GuidanceBridge, GuidanceLease } from '../../ui/guidance';
import { TOURS } from './catalog';
import { createTourController } from './controller';
import { createTutorialStore, defaultPreferences } from './storage';
import type { TourId } from './types';
import { parseClubRoute } from '../routes';
type Scope = { begin: () => GuidanceLease; lease?: GuidanceLease };
export function createTutorialRuntime(getStorage: () => Storage) {
  const store = createTutorialStore(getStorage),
    loaded = store.load(),
    controller = createTourController(TOURS, loaded.value);
  let storage = { available: loaded.available, writable: loaded.writable },
    welcome: TourId | null = null,
    revision = 0;
  let view: ReturnType<typeof controller.snapshot> & {
    storage: typeof storage;
    welcome: TourId | null;
    revision: number;
  } = { ...controller.snapshot(), storage, welcome, revision };
  let locked = false,
    origin: HTMLElement | null = null,
    routeKey: string | null = null,
    routeTour: TourId | null = null,
    disposed = false;
  let pending: { key: string; id: TourId; mode: 'start' | 'resume' | 'restart' } | null = null;
  const listeners = new Set<() => void>(),
    guards = new Set<() => boolean>(),
    locks = new Set<(on: boolean) => void>();
  const targets = new Map<string, Set<{ node: HTMLElement; ready: boolean }>>(),
    scopes = new Map<string, Set<Scope>>(),
    entries = new Map<TourId, boolean>();
  const publish = () => {
    if (disposed) return;
    view = { ...controller.snapshot(), storage, welcome, revision: ++revision };
    for (const fn of listeners) fn();
  };
  const setLock = (on: boolean) => {
    if (locked === on) return;
    locked = on;
    for (const fn of locks) fn(on);
  };
  const modal = () =>
    !!document.querySelector(
      'dialog[open]:not([data-tutorial]),[aria-modal="true"]:not([data-tutorial])',
    );
  const allowed = () => !modal() && [...guards].every((fn) => fn());
  function acquire() {
    if (!locked) {
      origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setLock(true);
    }
  }
  function release(restore = true) {
    if (!locked) return;
    for (const set of scopes.values())
      for (const scope of set)
        if (scope.lease) {
          if (restore) scope.lease.restore();
          scope.lease.dispose();
          scope.lease = undefined;
        }
    setLock(false);
    const focus = origin,
      focusAtRelease = document.activeElement;
    origin = null;
    // Native document key events can precede React's overlay cleanup. Restore on
    // the next task so the departing focus scope cannot pull focus back inside.
    if (restore)
      setTimeout(() => {
        if (!locked && !disposed) {
          // A user may have already moved to a page control after dismissal.
          // Keep that newer focus instead of overriding their next key press.
          if (document.activeElement !== focusAtRelease && document.activeElement !== document.body)
            return;
          if (focus?.isConnected) focus.focus();
          else document.querySelector<HTMLElement>('main h1,main')?.focus();
        }
      }, 0);
  }
  let lastPreferences = controller.snapshot().preferences;
  controller.subscribe(() => {
    const preferences = controller.snapshot().preferences;
    if (preferences !== lastPreferences && !store.save(preferences))
      storage = { ...storage, writable: false };
    lastPreferences = preferences;
    if (!controller.snapshot().run && !welcome) release();
    publish();
  });
  const bridge: GuidanceBridge = {
    registerTarget(id, node, ready) {
      const item = { node, ready },
        set = targets.get(id) ?? new Set();
      targets.set(id, set);
      set.add(item);
      node.dataset.guidance = id;
      publish();
      return () => {
        set.delete(item);
        if (node.dataset.guidance === id) delete node.dataset.guidance;
        publish();
      };
    },
    emit(action) {
      const run = controller.snapshot().run;
      if (run) controller.action(run.token, action);
    },
    registerScope(id, begin) {
      const scope: Scope = { begin },
        set = scopes.get(id) ?? new Set();
      scopes.set(id, set);
      set.add(scope);
      if (controller.snapshot().run && set.size === 1) scope.lease = begin();
      return () => {
        scope.lease?.dispose();
        scope.lease = undefined;
        set.delete(scope);
      };
    },
  };
  function getTarget(id: string) {
    const set = targets.get(id);
    if (set?.size !== 1) return null;
    const item = [...set][0];
    return item.ready &&
      item.node.isConnected &&
      !item.node.matches(':disabled') &&
      !item.node.closest('[hidden]')
      ? item.node
      : null;
  }
  function requestStart(id: TourId, mode: 'start' | 'resume' | 'restart' = 'resume') {
    if (!allowed() || routeTour !== id || !entries.get(id)) return false;
    acquire();
    welcome = null;
    for (const set of scopes.values())
      if (set.size === 1) for (const scope of set) if (!scope.lease) scope.lease = scope.begin();
    controller.start(id, mode);
    return true;
  }
  function exit() {
    pending = null;
    welcome = null;
    if (controller.snapshot().run) controller.exit();
    else {
      release();
      publish();
    }
  }
  return {
    controller,
    bridge,
    snapshot: () => view,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getTarget,
    requestStart,
    openTour(href: string, id: TourId, mode: 'start' | 'resume' | 'restart') {
      if (!href.startsWith('#/') || parseClubRoute(href).kind === 'not-found') return;
      exit();
      pending = { key: JSON.stringify(parseClubRoute(href)), id, mode };
      if (location.hash !== href) location.hash = href;
      publish();
    },
    exit,
    dismissInvitation: (id: TourId) => controller.dismiss(id),
    resetPreferences() {
      const reset = store.reset();
      storage = { available: reset, writable: reset };
      welcome = null;
      controller.resetPreferences({ ...defaultPreferences(), welcome: 'later' });
    },
    registerGuard(fn: () => boolean) {
      guards.add(fn);
      return () => {
        guards.delete(fn);
      };
    },
    registerInputLock(fn: (on: boolean) => void) {
      locks.add(fn);
      fn(locked);
      return () => {
        locks.delete(fn);
        fn(false);
      };
    },
    registerEntry(id: TourId, ready: boolean) {
      entries.set(id, ready);
      publish();
      return () => {
        entries.delete(id);
        publish();
      };
    },
    setRoute(key: string, tour: TourId | null) {
      if (routeKey !== null && key !== routeKey) {
        const waiting = pending?.key === key ? pending : null;
        release(false);
        exit();
        pending = waiting;
      }
      routeKey = key;
      routeTour = tour;
      publish();
    },
    interact() {
      if (!locked && controller.snapshot().preferences.welcome === 'new')
        controller.setWelcome('later');
    },
    offer() {
      if (pending) {
        if (routeKey !== pending.key || locked || !allowed()) return;
        const { id, mode } = pending,
          saved = controller.snapshot().preferences.tours[id];
        const step =
          mode === 'resume' &&
          saved &&
          !saved.completed &&
          saved.contentVersion === TOURS[id].contentVersion
            ? (TOURS[id].steps.find((s) => s.id === saved.nextStepId) ?? TOURS[id].steps[0])
            : TOURS[id].steps[0];
        if (getTarget(step.targetId) && requestStart(id, mode)) pending = null;
        return;
      }
      if (
        locked ||
        !routeTour ||
        !entries.get(routeTour) ||
        !allowed() ||
        controller.snapshot().preferences.welcome !== 'new' ||
        !getTarget(TOURS[routeTour].steps[0].targetId)
      )
        return;
      acquire();
      welcome = routeTour;
      publish();
    },
    welcomeChoice(value: 'later' | 'never') {
      welcome = null;
      controller.setWelcome(value);
    },
    dispose() {
      disposed = true;
      release(false);
      controller.dispose();
      listeners.clear();
      targets.clear();
      scopes.clear();
    },
  };
}
export type TutorialRuntime = ReturnType<typeof createTutorialRuntime>;
