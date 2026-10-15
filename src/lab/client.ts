import type { SolveInput } from '../core/types';
import type { LabCoverage, LabInput, LabRoute, LabSettings, LabStopReason } from './types';
import type { VerifiedLabRoute } from './validate';
import { createLabBudget, LabStopped, type LabBudget } from './budget';
import { selectLabRoutes } from './selection';
import {
  emptyLabCoverage,
  isLabReply,
  isLabSettings,
  labNow,
  LAB_CLIENT_ENTRIES,
  LAB_CLIENT_OPERATIONS,
  type LabWorkerPort,
} from '../workers/lab-protocol';

export interface LabIssue {
  code: 'input' | 'assets' | 'search' | 'protocol' | 'verification' | 'timeout' | 'limit';
  message: string;
}
export interface LabClientSnapshot {
  requestId: number;
  inputFingerprint?: string;
  phase: 'idle' | 'initializing' | 'searching' | 'stopped' | 'complete' | 'error';
  routes: readonly VerifiedLabRoute[];
  recommendedRouteId?: string;
  coverage?: LabCoverage;
  settings?: LabSettings;
  issue?: LabIssue;
}
export interface LabClient {
  analyze(input: SolveInput, settings: LabSettings): void;
  stop(): void;
  snapshot(): LabClientSnapshot;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}
export interface LabClientControl {
  budget: LabBudget;
  now: () => number;
  cancelled: () => boolean;
}
export interface LabClientDependencies {
  factory?: () => LabWorkerPort;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => number | ReturnType<typeof setTimeout>;
  clearTimer?: (timer: number | ReturnType<typeof setTimeout>) => void;
  prepare?: (input: SolveInput, control: LabClientControl) => Promise<LabInput>;
  verify?: (input: LabInput, raw: unknown, control: LabClientControl) => Promise<VerifiedLabRoute>;
}
class AssetError extends Error {}
async function defaultPrepare(input: SolveInput, control: LabClientControl) {
  const { loadLabContext, drainLabAsync } = await import('../workers/lab-request');
  const context = await loadLabContext().catch((error) => {
    throw new AssetError(
      'Lab assets could not load. Check your connection and try Analyze again.',
      { cause: error },
    );
  });
  const { prepareLabInputSteps } = await import('./input');
  return drainLabAsync(
    prepareLabInputSteps(context.engine, input, control.budget),
    control.budget,
    () => {},
    control.now,
  );
}
async function defaultVerify(input: LabInput, raw: unknown, control: LabClientControl) {
  const [{ loadLabContext, drainLabAsync }, { validateLabRouteSteps }] = await Promise.all([
    import('../workers/lab-request'),
    import('./validate'),
  ]);
  const context = await loadLabContext();
  return drainLabAsync(
    validateLabRouteSteps(context, input, raw, 'current', control.budget),
    control.budget,
    () => {},
    control.now,
  );
}
interface RequestState {
  id: number;
  active: boolean;
  worker?: LabWorkerPort;
  timer?: number | ReturnType<typeof setTimeout>;
  control: LabClientControl;
  prepared?: LabInput;
  queue: LabRoute[];
  seen: Map<string, string>;
  validating: boolean;
  done?: LabStopReason;
  workerCoverage?: LabCoverage;
}
/** A worker message is evidence to check, never permission to expose a route. */
export function createLabClient(deps: LabClientDependencies = {}): LabClient {
  const now = deps.now ?? labNow,
    setTimer = deps.setTimer ?? setTimeout,
    clearTimer = deps.clearTimer ?? clearTimeout;
  const listeners = new Set<() => void>();
  let snapshot: LabClientSnapshot = Object.freeze({
    requestId: 0,
    phase: 'idle',
    routes: Object.freeze([]),
  });
  let current: RequestState | undefined,
    disposed = false;
  function publish(update: Partial<LabClientSnapshot>) {
    snapshot = Object.freeze({ ...snapshot, ...update });
    for (const listener of listeners) listener();
  }
  const live = (r: RequestState) => !disposed && current === r && r.active;
  function detach(r: RequestState) {
    if (r.worker) {
      r.worker.onmessage = null;
      r.worker.onerror = null;
      r.worker.terminate();
      r.worker = undefined;
    }
  }
  function cancel(r: RequestState) {
    r.active = false;
    detach(r);
    if (r.timer !== undefined) clearTimer(r.timer);
    r.timer = undefined;
    r.queue.length = 0;
    for (const id of r.seen.keys()) r.control.budget.release(id);
    r.seen.clear();
  }
  function issue(code: LabIssue['code'], message: string) {
    publish({ issue: { code, message } });
  }
  function finish(r: RequestState, phase: LabClientSnapshot['phase'], problem?: LabIssue) {
    if (!live(r)) return;
    const own = r.control.budget.snapshot();
    const coverage = r.workerCoverage
      ? {
          ...r.workerCoverage,
          operations: r.workerCoverage.operations + own.operations,
          entryHighWater: r.workerCoverage.entryHighWater + own.entryHighWater,
          elapsedMs: own.elapsedMs,
        }
      : snapshot.coverage;
    cancel(r);
    publish({ phase, coverage, ...(problem ? { issue: problem } : {}) });
  }
  function stopped(r: RequestState, reason: LabStopReason) {
    finish(
      r,
      reason === 'complete' ? 'complete' : 'stopped',
      reason === 'complete'
        ? undefined
        : {
            code: reason === 'time-limit' ? 'timeout' : 'limit',
            message:
              reason === 'no-route'
                ? 'No complete verified route was found. Try another input or color.'
                : `Search ended (${reason}). Verified routes remain available; the search is incomplete.`,
          },
    );
  }
  async function drain(r: RequestState) {
    if (!live(r) || !r.prepared || r.validating) return;
    r.validating = true;
    try {
      while (live(r) && r.queue.length) {
        const raw = r.queue.shift()!;
        if (raw.inputFingerprint !== r.prepared.fingerprint) {
          issue('protocol', 'A route belongs to a different input and was discarded.');
          continue;
        }
        try {
          const checked = await (deps.verify ?? defaultVerify)(r.prepared, raw, r.control);
          if (!live(r)) return;
          const wrappers = [...snapshot.routes, checked];
          const selected = selectLabRoutes(wrappers.map((w) => w.route));
          const routes = selected.map((route) => wrappers.find((w) => w.route === route)!);
          // Unrated physical routes may be played, but never recommended by this model.
          if (!routes.length) routes.push(checked);
          publish({
            routes: Object.freeze(routes),
            recommendedRouteId: selected[0]?.id,
            phase: 'searching',
          });
        } catch (error) {
          if (!live(r)) return;
          if (error instanceof LabStopped) {
            stopped(r, error.reason);
            return;
          }
          issue(
            'verification',
            `A candidate failed independent replay and was discarded: ${error instanceof Error ? error.message : 'Invalid route.'}`,
          );
        }
      }
    } finally {
      r.validating = false;
      if (live(r) && r.done && !r.queue.length) stopped(r, r.done);
    }
  }
  return {
    snapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    analyze(input, settings) {
      if (disposed) return;
      if (current) cancel(current);
      const id = snapshot.requestId + 1,
        startedAt = now();
      publish({
        requestId: id,
        phase: 'initializing',
        routes: Object.freeze([]),
        recommendedRouteId: undefined,
        inputFingerprint: undefined,
        coverage: undefined,
        settings: undefined,
        issue: undefined,
      });
      if (!isLabSettings(settings)) {
        publish({
          phase: 'error',
          issue: { code: 'input', message: 'Select at least one supported bottom color.' },
        });
        return;
      }
      const r: RequestState = {
        id,
        active: true,
        queue: [],
        seen: new Map(),
        validating: false,
        control: undefined!,
      };
      current = r;
      r.control = {
        now,
        cancelled: () => !live(r),
        budget: createLabBudget({
          now,
          startedAt,
          maxOperations: LAB_CLIENT_OPERATIONS,
          maxEntries: LAB_CLIENT_ENTRIES,
          cancelled: () => !live(r),
        }),
      };
      publish({ coverage: emptyLabCoverage(settings), settings: structuredClone(settings) });
      r.timer = setTimer(
        () =>
          finish(r, 'stopped', {
            code: 'timeout',
            message: 'The 30-second analysis limit was reached. Verified routes remain available.',
          }),
        30_500,
      );
      try {
        const worker: LabWorkerPort = (
          deps.factory ??
          (() =>
            new Worker(new URL('../workers/lab.worker.ts', import.meta.url), { type: 'module' }))
        )();
        r.worker = worker;
        worker.onmessage = ({ data }) => {
          if (!live(r) || r.done) return;
          if (!data || data.requestId !== id) return;
          if (!isLabReply(data)) {
            issue('protocol', 'A malformed worker reply was discarded.');
            return;
          }
          if (data.kind === 'initializing') return;
          if (data.kind === 'error') {
            finish(r, 'error', { code: data.code, message: data.message });
            return;
          }
          if (data.kind === 'progress' || data.kind === 'done') {
            r.workerCoverage = data.coverage;
            publish({
              coverage: {
                ...data.coverage,
                operations: data.coverage.operations + r.control.budget.snapshot().operations,
              },
              phase: 'searching',
            });
            if (data.kind === 'done') {
              r.done = data.reason;
              detach(r);
              void drain(r);
            }
            return;
          }
          if (r.prepared && data.route.inputFingerprint !== r.prepared.fingerprint) {
            issue('protocol', 'A route belongs to a different input and was discarded.');
            return;
          }
          let encoded: string;
          try {
            encoded = JSON.stringify(data.route);
          } catch {
            issue('protocol', 'An unreadable route was discarded.');
            return;
          }
          if (encoded.length > 2_000_000) {
            issue('protocol', 'An oversized route was discarded.');
            return;
          }
          const prior = r.seen.get(data.route.id);
          if (prior !== undefined) {
            if (prior !== encoded)
              issue(
                'protocol',
                'Conflicting routes used the same identity; the update was discarded.',
              );
            return;
          }
          // Bounded metadata (64 identities), four pending routes, one active replay.
          if (r.seen.size >= 64) {
            const first = r.seen.keys().next().value!;
            r.seen.delete(first);
            r.control.budget.release(first);
          }
          try {
            if (!r.control.budget.retain(data.route.id)) {
              stopped(r, 'frontier-limit');
              return;
            }
          } catch (error) {
            if (error instanceof LabStopped) {
              stopped(r, error.reason);
              return;
            }
            throw error;
          }
          r.seen.set(data.route.id, encoded);
          if (r.queue.length === 4) r.queue.shift();
          r.queue.push(data.route);
          void drain(r);
        };
        worker.onerror = () =>
          finish(r, 'error', {
            code: 'search',
            message: 'The analysis worker stopped unexpectedly. Verified routes remain available.',
          });
        worker.postMessage({
          kind: 'analyze',
          requestId: id,
          input,
          settings,
          startedAt,
          deadlineAt: startedAt + 30_000,
        });
      } catch (error) {
        finish(r, 'error', {
          code: 'assets',
          message: `The analysis worker could not start: ${String(error)}`,
        });
        return;
      }
      void (deps.prepare ?? defaultPrepare)(input, r.control)
        .then((prepared) => {
          if (!live(r)) return;
          r.prepared = prepared;
          publish({ inputFingerprint: prepared.fingerprint });
          void drain(r);
        })
        .catch((error) => {
          if (!live(r)) return;
          if (error instanceof LabStopped) {
            stopped(r, error.reason);
            return;
          }
          finish(r, 'error', {
            code: error instanceof AssetError ? 'assets' : 'input',
            message: error instanceof Error ? error.message : 'Invalid cube input.',
          });
        });
    },
    stop() {
      if (current && live(current)) finish(current, 'stopped');
    },
    dispose() {
      if (current) cancel(current);
      disposed = true;
      listeners.clear();
    },
  };
}
