import type { CubeEngine } from '../core/types';
import type { LabStopReason } from './types';

export type LabWork = { kind: 'work' };
export const LAB_WORK: LabWork = Object.freeze({ kind: 'work' });
export class LabStopped extends Error {
  constructor(public readonly reason: LabStopReason) {
    super(`Lab search stopped: ${reason}`);
  }
}
export interface LabBudgetSnapshot {
  operations: number;
  byKind: Record<'expand' | 'simulate' | 'score', number>;
  elapsedMs: number;
  entries: number;
  entryHighWater: number;
}
export interface LabBudget {
  charge(kind: 'expand' | 'simulate' | 'score', count?: number): void;
  checkpoint(): void;
  remaining(): number;
  snapshot(): LabBudgetSnapshot;
  retain(key: unknown): boolean;
  release(key: unknown): void;
}
interface Options {
  now?: () => number;
  startedAt?: number;
  deadlineMs?: number;
  maxOperations?: number;
  maxEntries?: number;
  cancelled?: () => boolean;
}
function ceiling(value: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > max)
    throw Error('Invalid Lab resource ceiling.');
  return value;
}
export function createLabBudget(options: Options = {}): LabBudget {
  const now = options.now ?? (() => performance.now()),
    start = options.startedAt ?? now();
  if (!Number.isFinite(start)) throw Error('Invalid Lab start time.');
  const deadline = start + ceiling(options.deadlineMs ?? 30_000, 30_000);
  const max = ceiling(options.maxOperations ?? 2_000_000, 2_000_000);
  const capacity = ceiling(options.maxEntries ?? 25_000, 25_000);
  const entries = new Set<unknown>();
  const counts = { expand: 0, simulate: 0, score: 0 };
  let used = 0,
    high = 0;
  function checkpoint() {
    if (options.cancelled?.()) throw new LabStopped('cancelled');
    if (now() >= deadline) throw new LabStopped('time-limit');
  }
  return {
    checkpoint,
    charge(kind, count = 1) {
      checkpoint();
      if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid Lab work charge.');
      if (used + count > max) throw new LabStopped('work-limit');
      counts[kind] += count;
      used += count;
    },
    remaining: () => max - used,
    snapshot: () => ({
      operations: used,
      byKind: { ...counts },
      elapsedMs: Math.max(0, now() - start),
      entries: entries.size,
      entryHighWater: high,
    }),
    retain(key) {
      checkpoint();
      if (entries.has(key)) return true;
      if (entries.size >= capacity) return false;
      entries.add(key);
      high = Math.max(high, entries.size);
      return true;
    },
    release: (key) => {
      entries.delete(key);
    },
  };
}

const metered = new WeakMap<LabBudget, WeakMap<CubeEngine, CubeEngine>>();
const origins = new WeakMap<CubeEngine, CubeEngine>();
/** A logical move still costs work on a transformation-cache hit. */
export function meterLabEngine(engine: CubeEngine, budget: LabBudget): CubeEngine {
  const base = origins.get(engine) ?? engine;
  let map = metered.get(budget);
  if (!map) {
    map = new WeakMap();
    metered.set(budget, map);
  }
  const existing = map.get(base);
  if (existing) return existing;
  const wrapped: CubeEngine = {
    solved() {
      budget.charge('simulate');
      return base.solved();
    },
    apply(state, moves) {
      budget.charge('simulate', Math.max(1, moves.length));
      return base.apply(state, moves);
    },
    observe(state) {
      budget.charge('score');
      return base.observe(state);
    },
    isSolved(state) {
      budget.charge('score');
      return base.isSolved(state);
    },
    equals(a, b) {
      budget.charge('score');
      return base.equals(a, b);
    },
  };
  map.set(base, wrapped);
  origins.set(wrapped, base);
  return wrapped;
}
