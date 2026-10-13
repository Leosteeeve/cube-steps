import { beforeAll, it, expect } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { createF2LBudget } from './budget';
import { f2lSignature } from './recognize';
import { getCaseFixture } from '../../../algorithms/fixtures';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('counts nested recognition rotations and rejects work before the limit is exceeded', () => {
  const b = createF2LBudget(engine, 1),
    f = getCaseFixture('f2l-20/br/u0')!;
  expect(f2lSignature(b.engine, f.initial, f.target!)).toMatch(/^BR/);
  expect(b.used()).toBe(1);
  expect(() => b.engine.apply(f.initial, ['U'])).toThrow(/budget/i);
  expect(b.used()).toBe(1);
});
