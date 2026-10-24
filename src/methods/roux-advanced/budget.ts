import type { CubeEngine } from '../../core/types';
import type { RouxBudgetSnapshot, RouxSearchBudget, RouxSearchMode, RouxStopReason } from './types';
export class RouxBudgetStop extends Error {
  constructor(
    public readonly reason: RouxStopReason,
    public readonly snapshot: RouxBudgetSnapshot,
  ) {
    super(`Roux search stopped: ${reason}`);
  }
}
interface Options {
  now?: () => number;
  startedAt?: number;
  cancelled?: () => boolean;
  maxOperations?: number;
  deadlineMs?: number;
}
const integer = (n: number, max = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isSafeInteger(n) || n < 0 || n > max) throw Error('Invalid Roux resource value.');
  return n;
};
export function createRouxSearchBudget(
  mode: RouxSearchMode,
  options: Options = {},
): RouxSearchBudget {
  if (mode !== 'normal' && mode !== 'lab') throw Error('Unknown Roux search mode.');
  const now = options.now ?? (() => performance.now()),
    start = options.startedAt ?? now();
  if (!Number.isFinite(start)) throw Error('Invalid Roux start time.');
  const max = integer(
    options.maxOperations ?? (mode === 'normal' ? 500000 : 2000000),
    mode === 'normal' ? 500000 : 2000000,
  );
  const deadline =
    start +
    integer(
      options.deadlineMs ?? (mode === 'normal' ? 8000 : 30000),
      mode === 'normal' ? 8000 : 30000,
    );
  let operations = 0,
    retainedBytes = 0,
    reason: RouxStopReason | undefined;
  const entries = new Map<string, number>();
  const time = () => {
    const t = now();
    if (!Number.isFinite(t)) throw Error('Invalid Roux clock.');
    return t;
  };
  const snapshot = (): RouxBudgetSnapshot => ({
    operations,
    retainedBytes,
    entries: entries.size,
    elapsedMs: Math.max(0, time() - start),
    ...(reason ? { reason } : {}),
  });
  const stop = (why: RouxStopReason): never => {
    reason = why;
    throw new RouxBudgetStop(why, snapshot());
  };
  const checkpoint = () => {
    if (options.cancelled?.()) stop('cancelled');
    if (time() >= deadline) stop('time-limit');
    if (reason) stop(reason);
  };
  return {
    mode,
    checkpoint,
    snapshot,
    charge(kind, n = 1) {
      integer(n);
      checkpoint();
      if (!['expand', 'simulate', 'score'].includes(kind)) throw Error('Unknown Roux work kind.');
      if (n > max - operations) stop('work-limit');
      operations += n;
    },
    remaining: () => ({
      operations: max - operations,
      milliseconds: Math.max(0, deadline - time()),
    }),
    retain(key, bytes) {
      integer(bytes);
      checkpoint();
      if (typeof key !== 'string') throw Error('Invalid Roux retained entry key.');
      if (!entries.has(key) && entries.size >= 25000) stop('frontier-limit');
      const total = retainedBytes - (entries.get(key) ?? 0) + bytes;
      if (total > 128 * 1024 * 1024) stop('memory-limit');
      entries.set(key, bytes);
      retainedBytes = total;
    },
    release(key) {
      retainedBytes -= entries.get(key) ?? 0;
      entries.delete(key);
    },
  };
}
const cache = new WeakMap<RouxSearchBudget, WeakMap<CubeEngine, CubeEngine>>(),
  origins = new WeakMap<CubeEngine, CubeEngine>();
export function meterRouxEngine(engine: CubeEngine, budget: RouxSearchBudget): CubeEngine {
  const base = origins.get(engine) ?? engine;
  let byEngine = cache.get(budget);
  if (!byEngine) {
    byEngine = new WeakMap();
    cache.set(budget, byEngine);
  }
  const prior = byEngine.get(base);
  if (prior) return prior;
  const wrapped: CubeEngine = {
    solved() {
      budget.charge('simulate');
      return base.solved();
    },
    apply(s, m) {
      budget.charge('simulate', Math.max(1, m.length));
      return base.apply(s, m);
    },
    observe(s) {
      budget.charge('score');
      return base.observe(s);
    },
    isSolved(s) {
      budget.charge('score');
      return base.isSolved(s);
    },
    equals(a, b) {
      budget.charge('score');
      return base.equals(a, b);
    },
  };
  origins.set(wrapped, base);
  byEngine.set(base, wrapped);
  return wrapped;
}
