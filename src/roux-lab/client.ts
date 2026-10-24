import type { CubeEngine, SolveInput } from '../core/types';
import type { AdvancedRouxOutcome, RouxCoverage, RouxRoute, RouxSettings } from './types';
import type { RouxSearchBudget, RouxStopReason } from '../methods/roux-advanced/types';
import type { AdvancedRouxAssets } from '../methods/roux-advanced/assets';
import {
  createRouxSearchBudget,
  meterRouxEngine,
  RouxBudgetStop,
} from '../methods/roux-advanced/budget';
import { prepareRouxInput, prepareRouxInputSteps } from '../methods/roux-advanced/input';
import {
  validateRouxRouteSteps,
  checkedFirstBlockEvidence,
} from '../methods/roux-advanced/validate';
import { drainRouxAsync } from '../workers/roux-advanced-request';
import { selectRouxRoutes } from '../methods/roux-advanced/selection';
import { ROUX_FRAMES } from '../methods/roux-advanced/frames';
import { freezeLabValue } from '../lab/input';
import { advancedRouxAssetBytes, loadAdvancedRouxAssets } from '../methods/roux-advanced/assets';
import {
  emptyRouxCoverage,
  isRouxReply,
  isRouxSettings,
  isRouxInputShape,
  rouxDuration,
  rouxNow,
  ROUX_CLIENT_OPERATIONS,
  ROUX_WORKER_OPERATIONS,
  type RouxWorkerPort,
} from '../workers/roux-advanced-protocol';
export type RouxClientEvent =
  { kind: 'candidate'; route: RouxRoute } | { kind: 'progress'; coverage: RouxCoverage };
export interface RouxSearchClient {
  start(
    input: SolveInput,
    settings: RouxSettings,
    onEvent: (event: RouxClientEvent) => void,
    timing?: { startedAtEpochMs: number },
  ): { stop(): void; done: Promise<AdvancedRouxOutcome> };
  dispose(): void;
}
export interface RouxClientOptions {
  workerFactory?: () => RouxWorkerPort;
  now?: () => number;
  loadAssets?: (signal: AbortSignal) => Promise<AdvancedRouxAssets>;
  yieldTask?: () => Promise<void>;
}
type Pending = {
  id: number;
  live: boolean;
  worker?: RouxWorkerPort;
  timer?: ReturnType<typeof setTimeout>;
  abort: AbortController;
  input: SolveInput;
  settings: RouxSettings;
  start: number;
  budget: RouxSearchBudget;
  coverage: RouxCoverage;
  routes: RouxRoute[];
  queue: { route: RouxRoute; key: string }[];
  seen: Map<string, string>;
  validating: boolean;
  terminal?: AdvancedRouxOutcome;
  assets?: AdvancedRouxAssets;
  prepared?: ReturnType<typeof prepareRouxInput>;
  event: (event: RouxClientEvent) => void;
  resolve: (outcome: AdvancedRouxOutcome) => void;
  verified: number;
  serial: number;
};
const sourceKey = (s: SolveInput) =>
  JSON.stringify(
    s.kind === 'scramble'
      ? ['scramble', s.moves]
      : ['facelets', ...(['U', 'R', 'F', 'D', 'L', 'B'] as const).map((f) => s.facelets[f])],
  );
export function createRouxSearchClient(
  engine: CubeEngine,
  options: RouxClientOptions = {},
): RouxSearchClient {
  const now = options.now ?? rouxNow;
  let nextId = 0,
    current: Pending | undefined,
    disposed = false;
  const preferEvidence = (
    prior: RouxRoute['evidence'] | undefined,
    next: RouxRoute['evidence'],
  ) => {
    if (!prior || prior.status === 'not-explored') return next;
    if (next.status === 'not-explored' || prior.status === 'proven-minimum') return prior;
    if (next.status === 'proven-minimum') return next;
    return next.upperBound < prior.upperBound ? next : prior;
  };
  const live = (r: Pending) => r.live && current === r && !disposed;
  function finish(
    r: Pending,
    reason: RouxStopReason,
    message?: string,
    code: 'budget' | 'initialization' | 'verification' | 'unsupported-case' = 'budget',
  ) {
    if (!live(r)) return;
    const own = r.budget.snapshot(),
      coverage: RouxCoverage = {
        ...r.coverage,
        elapsedMs: Math.max(0, now() - r.start),
        operations: r.coverage.operations + own.operations,
        entries: r.coverage.entries + own.entries,
        retainedBytes: r.coverage.retainedBytes + own.retainedBytes,
        verifiedRoutes: r.verified,
        reason,
      };
    const routes = selectRouxRoutes(
      r.routes,
      coverage.frames,
      r.settings.mode === 'normal' ? 1 : 4,
    );
    r.live = false;
    r.abort.abort();
    if (r.timer !== undefined) clearTimeout(r.timer);
    if (r.worker) {
      r.worker.onmessage = null;
      r.worker.onerror = null;
      r.worker.terminate();
    }
    r.queue.length = 0;
    r.seen.clear();
    r.resolve(
      freezeLabValue(
        routes.length
          ? { ok: true, routes, coverage }
          : {
              ok: false,
              code,
              message:
                message ?? `No verified route was available when the search stopped (${reason}).`,
              coverage,
            },
      ),
    );
  }
  const failure = (r: Pending, error: unknown) =>
    finish(
      r,
      error instanceof RouxBudgetStop ? error.reason : 'error',
      error instanceof Error ? error.message : 'Roux result failed verification.',
      error instanceof RouxBudgetStop ? 'budget' : 'verification',
    );
  function coverage(r: Pending, raw: RouxCoverage) {
    const s = r.settings;
    if (
      raw.operations < r.coverage.operations ||
      raw.operations > ROUX_WORKER_OPERATIONS[s.mode] ||
      raw.entries > 24900 ||
      raw.retainedBytes > 96 * 1024 * 1024 ||
      Object.keys(raw.frames).some(
        (id) => !s.allowedFrames.includes(id as (typeof s.allowedFrames)[number]),
      )
    )
      throw Error('Worker coverage exceeds the requested Roux resources or frames.');
    const frames = { ...r.coverage.frames };
    for (const [id, evidence] of Object.entries(raw.frames)) {
      const frame = ROUX_FRAMES.find((f) => f.id === id)!;
      frames[frame.id] = preferEvidence(
        frames[frame.id],
        checkedFirstBlockEvidence(
          meterRouxEngine(engine, r.budget),
          r.prepared!,
          frame,
          evidence,
          r.assets!,
        ),
      );
    }
    r.coverage = { ...raw, frames };
    r.event(freezeLabValue({ kind: 'progress', coverage: { ...r.coverage } }));
  }
  async function drain(r: Pending) {
    if (!live(r) || r.validating || !r.assets || !r.prepared) return;
    r.validating = true;
    try {
      while (live(r) && r.queue.length) {
        const { route: raw, key } = r.queue.shift()!;
        r.budget.checkpoint();
        if (
          !r.settings.allowedFrames.includes(raw.frameId) ||
          sourceKey(raw.input.source) !== sourceKey(r.input) ||
          raw.input.fingerprint !== r.prepared.fingerprint
        )
          throw Error('Worker route belongs to a different input or forbidden frame.');
        const route = await drainRouxAsync(
          validateRouxRouteSteps(engine, raw, r.assets, r.budget),
          r.budget,
          () => {},
          now,
          options.yieldTask,
        );
        if (!live(r)) return;
        r.budget.checkpoint();
        r.verified++;
        r.coverage.frames = {
          ...r.coverage.frames,
          [route.frameId]: preferEvidence(r.coverage.frames[route.frameId], route.evidence),
        };
        const all = [...r.routes.filter((q) => q.id !== route.id), route],
          selected = selectRouxRoutes(all, r.coverage.frames, 4);
        const fallback = all.find((q) => q.basis === 'baseline-fallback');
        if (fallback && !selected.includes(fallback)) selected.push(fallback);
        r.budget.release(key);
        for (const old of r.routes)
          if (!selected.includes(old)) r.budget.release(`retained/${old.id}`);
        for (const next of selected)
          r.budget.retain(`retained/${next.id}`, JSON.stringify(next).length * 2 + 4096);
        r.routes = selected;
        r.event(freezeLabValue({ kind: 'candidate', route }));
      }
      if (live(r) && r.terminal)
        finish(
          r,
          r.terminal.coverage.reason ?? 'complete',
          r.terminal.ok ? undefined : r.terminal.message,
          r.terminal.ok ? 'budget' : r.terminal.code,
        );
    } catch (error) {
      if (live(r)) failure(r, error);
    } finally {
      r.validating = false;
    }
  }
  function enqueue(r: Pending, route: RouxRoute) {
    const signature = JSON.stringify(route);
    if (r.seen.has(signature)) return;
    if (r.queue.length >= 8) throw Error('Too many unverified Roux results.');
    const serial = r.serial++,
      key = `queued/${serial}`,
      dedup = `dedup/${serial}`;
    r.budget.retain(key, signature.length * 2 + 4096);
    r.budget.retain(dedup, signature.length * 2 + 512);
    r.seen.set(signature, dedup);
    // Dedup storage is also bounded: no unaccounted lifetime message history.
    if (r.seen.size > 8) {
      const [old, key] = r.seen.entries().next().value!;
      r.seen.delete(old);
      r.budget.release(key);
    }
    r.queue.push({ route, key });
    void drain(r);
  }
  return {
    start(input, settings, onEvent, timing) {
      if (current && live(current))
        finish(current, 'cancelled', 'A new Roux request replaced this search.');
      const id = ++nextId,
        start = timing?.startedAtEpochMs ?? now();
      if (
        disposed ||
        !isRouxSettings(settings) ||
        !isRouxInputShape(input) ||
        !Number.isFinite(start) ||
        start < 0 ||
        start > now() + 100
      ) {
        const safe: RouxSettings = {
          allowedFrames: ['white-blue'],
          mode: 'normal',
          modelVersion: 'roux-execution-v1',
        };
        return {
          stop() {},
          done: Promise.resolve({
            ok: false,
            code: 'initialization',
            message: 'Choose a supported Roux input and frame set.',
            coverage: emptyRouxCoverage(safe, 0, 'error'),
          }),
        };
      }
      let resolve!: (outcome: AdvancedRouxOutcome) => void;
      const done = new Promise<AdvancedRouxOutcome>((r) => {
        resolve = r;
      });
      const r: Pending = {
        id,
        live: true,
        abort: new AbortController(),
        input: structuredClone(input),
        settings: structuredClone(settings),
        start: Math.min(start, now()),
        budget: undefined as unknown as RouxSearchBudget,
        coverage: emptyRouxCoverage(settings),
        routes: [],
        queue: [],
        seen: new Map(),
        validating: false,
        event: onEvent,
        resolve,
        verified: 0,
        serial: 0,
      };
      r.budget = createRouxSearchBudget(settings.mode, {
        now,
        startedAt: r.start,
        cancelled: () => !live(r),
        maxOperations: ROUX_CLIENT_OPERATIONS[settings.mode],
        maxEntries: 100,
        maxRetainedBytes: 32 * 1024 * 1024,
      });
      current = r;
      r.timer = setTimeout(
        () => finish(r, 'time-limit'),
        Math.max(0, rouxDuration(settings) - (now() - r.start)),
      );
      void (async () => {
        try {
          r.budget.checkpoint();
          const assets = await (
            options.loadAssets ?? ((signal) => loadAdvancedRouxAssets(fetch, signal))
          )(r.abort.signal);
          if (!live(r)) return;
          r.budget.checkpoint();
          r.assets = assets;
          r.budget.retain('static-assets', advancedRouxAssetBytes(assets));
          r.prepared = await drainRouxAsync(
            prepareRouxInputSteps(meterRouxEngine(engine, r.budget), r.input),
            r.budget,
            () => {},
            now,
            options.yieldTask,
          );
          if (!live(r)) return;
          r.budget.checkpoint();
          const worker = (
            options.workerFactory ??
            (() =>
              new Worker(new URL('../workers/roux-advanced.worker.ts', import.meta.url), {
                type: 'module',
              }))
          )();
          r.worker = worker;
          worker.onmessage = (event: MessageEvent<unknown>) => {
            const { data } = event;
            if (!live(r)) return;
            // Stale receipts from a replaced request cannot change this snapshot.
            if (data && typeof data === 'object' && 'requestId' in data && data.requestId !== r.id)
              return;
            try {
              r.budget.checkpoint();
              if (!isRouxReply(data)) throw Error('Malformed Roux worker reply.');
              if (data.kind === 'candidate') enqueue(r, data.route);
              else if (data.kind === 'progress') coverage(r, data.coverage);
              else if (data.kind === 'error') finish(r, 'error', data.message, 'initialization');
              else {
                coverage(r, data.outcome.coverage);
                r.terminal = data.outcome;
                if (data.outcome.ok) for (const route of data.outcome.routes) enqueue(r, route);
                void drain(r);
              }
            } catch (error) {
              if (live(r)) failure(r, error);
            }
          };
          worker.onerror = (event) => {
            event.preventDefault();
            finish(
              r,
              'error',
              `The Roux worker could not continue: ${event.message}`,
              'initialization',
            );
          };
          worker.postMessage({
            kind: 'analyze',
            requestId: id,
            edition: 'club',
            input: r.input,
            settings: r.settings,
            startedAtEpochMs: r.start,
          });
        } catch (error) {
          if (live(r)) failure(r, error);
        }
      })();
      return { stop: () => finish(r, 'cancelled'), done };
    },
    dispose() {
      if (current && live(current)) finish(current, 'cancelled');
      disposed = true;
    },
  };
}
