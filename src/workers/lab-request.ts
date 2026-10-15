import type { LabContext } from '../lab/finalize';
import type { LabCoverage, LabInput, LabStopReason } from '../lab/types';
import { createLabBudget, LabStopped, type LabBudget, type LabWork } from '../lab/budget';
import {
  emptyLabCoverage,
  isLabSettings,
  LAB_BATCH_MS,
  LAB_BATCH_OPERATIONS,
  LAB_WORKER_OPERATIONS,
  LAB_WORKER_ENTRIES,
  labNow,
  labYieldTask,
  type LabReply,
  type LabRequest,
} from './lab-protocol';
export interface LabRequestDependencies {
  now?: () => number;
  load?: () => Promise<LabContext>;
  emit: (reply: LabReply) => void;
  cancelled?: () => boolean;
  yieldTask?: () => Promise<void>;
}
let contextPromise: Promise<LabContext> | undefined;
export function loadLabContext(): Promise<LabContext> {
  return (contextPromise ??= (async () => {
    const [{ createCubeEngine }, { loadCrossTable }, { EXECUTION_CATALOG }] = await Promise.all([
      import('../core/cube'),
      import('../methods/advanced/cross/load'),
      import('../lab/execution/profiles'),
    ]);
    const [engine, table] = await Promise.all([createCubeEngine(), loadCrossTable(fetch)]);
    return { engine, table, profiles: EXECUTION_CATALOG };
  })().catch((error) => {
    contextPromise = undefined;
    throw error;
  }));
}
export async function drainLabAsync<T, E>(
  iterator: Generator<E, T>,
  budget: LabBudget,
  onEvent: (event: E) => void,
  now: () => number = labNow,
  yieldTask: () => Promise<void> = labYieldTask,
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
        now() - start < LAB_BATCH_MS &&
        budget.snapshot().operations - ops < LAB_BATCH_OPERATIONS
      );
      await yieldTask();
    }
  } finally {
    iterator.return(undefined as T);
  }
}
export async function handleLabRequest(raw: unknown, deps: LabRequestDependencies): Promise<void> {
  const request = raw as LabRequest;
  if (!request || !Number.isSafeInteger(request.requestId) || request.requestId < 0) return;
  const now = deps.now ?? labNow,
    cancelled = deps.cancelled ?? (() => false),
    emit = (reply: LabReply) => deps.emit(reply),
    id = request.requestId;
  const fail = (code: 'input' | 'assets' | 'search', message: string) =>
    emit({ kind: 'error', requestId: id, code, message: message.slice(0, 2000) });
  if (
    request.kind !== 'analyze' ||
    !isLabSettings(request.settings) ||
    !request.input ||
    !['scramble', 'facelets'].includes(request.input.kind) ||
    !Number.isFinite(request.startedAt) ||
    !Number.isFinite(request.deadlineAt) ||
    request.deadlineAt - request.startedAt !== 30_000 ||
    request.startedAt > now() + 100
  ) {
    fail(
      'input',
      'Choose a legal scramble or six-face input and at least one supported bottom color.',
    );
    return;
  }
  let coverage = emptyLabCoverage(request.settings),
    budget: LabBudget | undefined;
  const done = (reason: LabStopReason) => {
    const s = budget?.snapshot();
    coverage = {
      ...coverage,
      elapsedMs: Math.max(0, now() - request.startedAt),
      ...(s ? { operations: s.operations, entryHighWater: s.entryHighWater } : {}),
      reason,
    };
    emit({ kind: 'done', requestId: id, reason, coverage });
  };
  emit({ kind: 'initializing', requestId: id });
  if (cancelled()) {
    done('cancelled');
    return;
  }
  if (now() >= request.deadlineAt) {
    done('time-limit');
    return;
  }
  let context: LabContext;
  try {
    context = await (deps.load ?? loadLabContext)();
  } catch (error) {
    if (cancelled()) done('cancelled');
    else if (now() >= request.deadlineAt) done('time-limit');
    else
      fail(
        'assets',
        `Lab assets could not load: ${error instanceof Error ? error.message : 'Unexpected asset error.'}`,
      );
    return;
  }
  if (cancelled()) {
    done('cancelled');
    return;
  }
  if (now() >= request.deadlineAt) {
    done('time-limit');
    return;
  }
  budget = createLabBudget({
    now,
    startedAt: request.startedAt,
    maxOperations: LAB_WORKER_OPERATIONS,
    maxEntries: LAB_WORKER_ENTRIES,
    cancelled,
  });
  let input: LabInput;
  try {
    const { prepareLabInputSteps } = await import('../lab/input');
    input = await drainLabAsync<LabInput, LabWork>(
      prepareLabInputSteps(context.engine, request.input, budget),
      budget,
      () => {},
      now,
      deps.yieldTask,
    );
  } catch (error) {
    if (error instanceof LabStopped) done(error.reason);
    else fail('input', error instanceof Error ? error.message : 'Invalid cube input.');
    return;
  }
  try {
    const { searchLab } = await import('../lab/search');
    let lastProgress = -Infinity,
      reason: LabStopReason = 'complete';
    await drainLabAsync(
      searchLab(context, input, request.settings, budget),
      budget,
      (event) => {
        if (event.kind === 'work') return;
        if (event.kind === 'candidate') {
          emit({ kind: 'candidate', requestId: id, route: event.route });
          return;
        }
        coverage = event.coverage;
        if (event.kind === 'done') {
          reason = event.reason;
          return;
        }
        if (now() - lastProgress >= 250) {
          lastProgress = now();
          emit({ kind: 'progress', requestId: id, coverage });
        }
      },
      now,
      deps.yieldTask,
    );
    done(reason);
  } catch (error) {
    if (error instanceof LabStopped) done(error.reason);
    else
      fail(
        'search',
        `No new verified route was produced: ${error instanceof Error ? error.message : 'Unexpected search error.'}`,
      );
  }
}
