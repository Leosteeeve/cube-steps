import { expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { createLabBudget, meterLabEngine } from './budget';

it('counts every simulation even when the underlying move transformation is cached', async () => {
  const base = await createCubeEngine(),
    budget = createLabBudget({ now: () => 0, maxOperations: 3 });
  const engine = meterLabEngine(base, budget),
    state = base.solved();
  engine.apply(state, ['R']);
  engine.apply(state, ['R']);
  budget.charge('expand');
  expect(budget.snapshot().operations).toBe(3);
  expect(() => engine.apply(state, ['R'])).toThrow(/work-limit/);
  expect(budget.snapshot().operations).toBe(3);
  expect(meterLabEngine(engine, budget)).toBe(engine);
});

it('shares deadlines, cancellation and storage ceilings without resetting on another root', () => {
  let now = 100,
    cancelled = false;
  const budget = createLabBudget({
    now: () => now,
    startedAt: 100,
    deadlineMs: 30,
    maxEntries: 2,
    cancelled: () => cancelled,
  });
  expect(budget.retain('first-root')).toBe(true);
  expect(budget.retain('second-root')).toBe(true);
  expect(budget.retain('first-root')).toBe(true);
  expect(budget.retain('third-root')).toBe(false);
  budget.release('first-root');
  expect(budget.retain('third-root')).toBe(true);
  expect(budget.snapshot().entryHighWater).toBe(2);
  now = 130;
  expect(() => budget.checkpoint()).toThrow(/time-limit/);
  now = 100;
  cancelled = true;
  expect(() => budget.checkpoint()).toThrow(/cancelled/);
});

it('refuses unsafe configuration and invalid charges instead of overflowing counters', () => {
  for (const options of [
    { maxOperations: 2_000_001 },
    { maxEntries: 25_001 },
    { deadlineMs: 30_001 },
    { maxOperations: NaN },
    { maxEntries: -1 },
  ])
    expect(() => createLabBudget(options)).toThrow();
  const budget = createLabBudget();
  expect(() => budget.charge('score', NaN)).toThrow();
  expect(() => budget.charge('simulate', -1)).toThrow();
});
