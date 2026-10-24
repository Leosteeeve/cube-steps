import type { CubeEngine } from '../core/types';
import type { AdvancedRouxAssets } from '../methods/roux-advanced/assets';
import { createRouxSearchBudget, RouxBudgetStop } from '../methods/roux-advanced/budget';
import type { RouxSearchBudget, RouxStopReason } from '../methods/roux-advanced/types';
import { prepareRouxInputSteps } from '../methods/roux-advanced/input';
import { meterRouxEngine } from '../methods/roux-advanced/budget';
import { searchAdvancedRoux } from '../methods/roux-advanced/search';
import {
  isRouxRequest,
  emptyRouxCoverage,
  rouxNow,
  rouxDuration,
  rouxYieldTask,
  ROUX_BATCH_MS,
  ROUX_BATCH_OPERATIONS,
  ROUX_WORKER_OPERATIONS,
  type RouxReply,
  type RouxRequest,
} from './roux-advanced-protocol';
export interface RouxContext {
  engine: CubeEngine;
  assets: AdvancedRouxAssets;
}
export interface RouxRequestDependencies {
  now?: () => number;
  load?: (signal: AbortSignal) => Promise<RouxContext>;
  emit: (reply: RouxReply) => void;
  cancelled?: () => boolean;
  yieldTask?: () => Promise<void>;
}
let context: Promise<RouxContext> | undefined;
export function loadRouxContext(signal: AbortSignal): Promise<RouxContext> {
  return (context ??= (async () => {
    const [{ createCubeEngine }, { loadAdvancedRouxAssets }] = await Promise.all([
      import('../core/cube'),
      import('../methods/roux-advanced/assets'),
    ]);
    const [engine, assets] = await Promise.all([
      createCubeEngine(),
      loadAdvancedRouxAssets(fetch, signal),
    ]);
    return { engine, assets };
  })().catch((error) => {
    context = undefined;
    throw error;
  }));
}
export async function drainRouxAsync<T, E>(
  iterator: Generator<E, T>,
  budget: RouxSearchBudget,
  onEvent: (event: E) => void,
  now: () => number = rouxNow,
  yieldTask: () => Promise<void> = rouxYieldTask,
): Promise<T> {
  try {
    for (;;) {
      const start = now(),
        ops = budget.snapshot().operations;
      do {
        const next = iterator.next();
        if (next.done) return next.value;
        onEvent(next.value);
      } while (
        now() - start < ROUX_BATCH_MS &&
        budget.snapshot().operations - ops < ROUX_BATCH_OPERATIONS
      );
      await yieldTask();
    }
  } finally {
    iterator.return(undefined as T);
  }
}
export async function handleRouxAdvancedRequest(
  raw: unknown,
  deps: RouxRequestDependencies,
): Promise<void> {
  const candidate = raw as RouxRequest;
  if (!candidate || !Number.isSafeInteger(candidate.requestId) || candidate.requestId < 0) return;
  const id = candidate.requestId,
    now = deps.now ?? rouxNow,
    cancelled = deps.cancelled ?? (() => false),
    emit = deps.emit;
  if (!isRouxRequest(raw) || raw.kind !== 'analyze' || raw.startedAtEpochMs > now() + 100) {
    emit({
      requestId: id,
      kind: 'error',
      message: 'Choose a legal club Roux request and at least one allowed frame.',
    });
    return;
  }
  const request = raw,
    start = Math.min(now(), request.startedAtEpochMs),
    controller = new AbortController(),
    budget = createRouxSearchBudget(request.settings.mode, {
      now,
      startedAt: start,
      cancelled,
      maxOperations: ROUX_WORKER_OPERATIONS[request.settings.mode],
      maxEntries: 24900,
      maxRetainedBytes: 96 * 1024 * 1024,
    });
  const stop = (reason: RouxStopReason, message: string) =>
    emit({
      kind: 'done',
      requestId: id,
      outcome: {
        ok: false,
        code: 'budget',
        message,
        coverage: {
          ...emptyRouxCoverage(request.settings),
          ...budget.snapshot(),
          elapsedMs: Math.max(0, now() - start),
          reason,
        },
      },
    });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    budget.checkpoint();
    emit({
      kind: 'progress',
      requestId: id,
      coverage: emptyRouxCoverage(request.settings, now() - start),
    });
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => {
          controller.abort();
          reject(new RouxBudgetStop('time-limit', budget.snapshot()));
        },
        Math.max(0, rouxDuration(request.settings) - (now() - start)),
      );
    });
    const loaded = await Promise.race([
      (deps.load ?? loadRouxContext)(controller.signal),
      deadline,
    ]);
    budget.checkpoint();
    const input = await drainRouxAsync(
      prepareRouxInputSteps(meterRouxEngine(loaded.engine, budget), request.input),
      budget,
      () => {},
      now,
      deps.yieldTask,
    );
    budget.checkpoint();
    let lastProgress = -Infinity,
      coverage = emptyRouxCoverage(request.settings);
    const outcome = await drainRouxAsync(
      searchAdvancedRoux(loaded.engine, input, request.settings, loaded.assets, budget),
      budget,
      (event) => {
        if (event.kind === 'progress') coverage = event.coverage;
        if (event.kind === 'result')
          coverage = {
            ...coverage,
            verifiedRoutes: coverage.verifiedRoutes + 1,
            frames: { ...coverage.frames, [event.route.frameId]: event.route.evidence },
          };
        if (event.kind === 'result' || now() - lastProgress >= 250) {
          lastProgress = now();
          emit({
            kind: 'progress',
            requestId: id,
            coverage: { ...coverage, ...budget.snapshot() },
          });
        }
        if (event.kind === 'result') emit({ kind: 'candidate', requestId: id, route: event.route });
      },
      now,
      deps.yieldTask,
    );
    emit({ kind: 'done', requestId: id, outcome });
  } catch (error) {
    if (cancelled()) stop('cancelled', 'This Roux search was cancelled.');
    else if (error instanceof RouxBudgetStop) stop(error.reason, error.message);
    else
      emit({
        kind: 'error',
        requestId: id,
        message: (error instanceof Error
          ? error.message
          : 'Unable to initialize Roux search.'
        ).slice(0, 2000),
      });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}
