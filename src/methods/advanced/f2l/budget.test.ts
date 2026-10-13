import { beforeAll, it, expect, vi } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { createF2LBudget } from './budget';
import { f2lSignature } from './recognize';
import { getCaseFixture } from '../../../algorithms/fixtures';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('reuses identical immutable simulations while counting cache hits against the limit', () => {
  const apply = vi.spyOn(engine, 'apply');
  try {
    const state = engine.solved(),
      b = createF2LBudget(engine, 3);
    const first = b.engine.apply(state, ['y']),
      again = b.engine.apply(structuredClone(state), ['y']);
    expect(engine.equals(first, again)).toBe(true);
    const second = b.engine.apply(first, ['y']);
    expect(engine.equals(first, second)).toBe(false);
    expect(b.used()).toBe(3);
    expect(apply).toHaveBeenCalledTimes(2);
    expect(() => b.engine.apply(state, ['y'])).toThrow(/budget/i);
  } finally {
    apply.mockRestore();
  }
});
it('counts nested recognition rotations and rejects work before the limit is exceeded', () => {
  const b = createF2LBudget(engine, 1),
    f = getCaseFixture('f2l-20/br/u0')!;
  expect(f2lSignature(b.engine, f.initial, f.target!)).toMatch(/^BR/);
  expect(b.used()).toBe(1);
  expect(() => b.engine.apply(f.initial, ['U'])).toThrow(/budget/i);
  expect(b.used()).toBe(1);
});
