import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { createRouxSearchBudget, meterRouxEngine, RouxBudgetStop } from './budget';
it.each([
  ['normal', 500000, 8000],
  ['lab', 2000000, 30000],
] as const)('enforces %s ceilings and carries stop evidence', (mode, work, deadline) => {
  let clock = 0;
  const budget = createRouxSearchBudget(mode, { now: () => clock });
  budget.charge('simulate', work);
  expect(budget.snapshot().operations).toBe(work);
  expect(() => budget.charge('expand')).toThrow(RouxBudgetStop);
  expect(budget.snapshot().reason).toBe('work-limit');
  const timed = createRouxSearchBudget(mode, { now: () => clock });
  clock = deadline - 1;
  timed.checkpoint();
  clock = deadline;
  expect(() => timed.checkpoint()).toThrow(RouxBudgetStop);
  expect(timed.remaining().milliseconds).toBe(0);
  expect(timed.snapshot().reason).toBe('time-limit');
});
it('limits entries, accounts replacement bytes, and releases memory', () => {
  const b = createRouxSearchBudget('lab', { now: () => 0 });
  for (let i = 0; i < 25000; i++) b.retain(String(i), 2);
  b.retain('0', 4);
  expect(b.snapshot()).toMatchObject({ entries: 25000, retainedBytes: 50002 });
  expect(() => b.retain('overflow', 1)).toThrow(RouxBudgetStop);
  const memory = createRouxSearchBudget('normal', { now: () => 0 });
  memory.retain('asset', 128 * 1024 * 1024);
  expect(() => memory.retain('more', 1)).toThrow(RouxBudgetStop);
  expect(memory.snapshot().reason).toBe('memory-limit');
  memory.release('asset');
  expect(memory.snapshot().retainedBytes).toBe(0);
});
it('rejects invalid ceilings and charges, never expands limits and cancels promptly', () => {
  for (const n of [-1, Infinity, NaN, 1.5, 500001])
    expect(() => createRouxSearchBudget('normal', { maxOperations: n })).toThrow();
  expect(() => createRouxSearchBudget('normal', { deadlineMs: 8001 })).toThrow();
  expect(() => createRouxSearchBudget('lab', { startedAt: NaN })).toThrow();
  const b = createRouxSearchBudget('normal', { now: () => 0 });
  for (const n of [-1, Infinity, NaN, 1.5]) {
    expect(() => b.charge('score', n)).toThrow();
    expect(() => b.retain('bad', n)).toThrow();
  }
  let cancelled = false;
  const c = createRouxSearchBudget('normal', { now: () => 0, cancelled: () => cancelled });
  cancelled = true;
  expect(() => c.checkpoint()).toThrow(RouxBudgetStop);
  expect(c.snapshot().reason).toBe('cancelled');
});
it('charges cache hits and avoids double wrapping the same engine', async () => {
  const engine = await createCubeEngine(),
    budget = createRouxSearchBudget('normal', { now: () => 0 });
  const m = meterRouxEngine(engine, budget);
  expect(meterRouxEngine(m, budget)).toBe(m);
  const s = m.solved();
  m.apply(s, ['R']);
  m.apply(s, ['R']);
  m.observe(s);
  m.equals(s, s);
  m.isSolved(s);
  expect(budget.snapshot().operations).toBe(6);
  const fresh = createRouxSearchBudget('normal', { now: () => 0 });
  meterRouxEngine(m, fresh).apply(s, ['R']);
  expect(fresh.snapshot().operations).toBe(1);
  expect(budget.snapshot().operations).toBe(6);
});
