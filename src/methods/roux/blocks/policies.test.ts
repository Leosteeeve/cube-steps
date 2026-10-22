import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { generateBlockPolicies, validateBlockPolicies, blockGoals } from './policies';
import { blockStateKey, planBlockGoal } from './planner';
import { createRouxBudget } from '../budget';
import { rouxReferenceState } from '../frame';
import { assertRouxActions } from '../../../../tests/helpers/roux';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('covers all projected legal base and pair placements including every center phase', () => {
  const policies = generateBlockPolicies(engine);
  expect(policies.tables).toHaveLength(10);
  for (const table of policies.tables) {
    expect(table.covered).toBe(table.expected);
    expect(table.expected).toBeGreaterThan(0);
    expect(table.rank.filter((r) => r >= 0)).toHaveLength(table.expected);
  }
  expect(() => validateBlockPolicies(policies)).not.toThrow();
});
it('rejects incomplete data and a different maneuver catalog', () => {
  const policies = generateBlockPolicies(engine);
  expect(() => validateBlockPolicies({ ...policies, tables: [] })).toThrow(/policy/i);
  expect(() => validateBlockPolicies({ ...policies, catalogDigest: 'changed' })).toThrow(
    /catalog/i,
  );
  const broken = structuredClone(policies);
  broken.tables[0].rank.fill(-1);
  expect(() => validateBlockPolicies(broken)).toThrow(/coverage/i);
});
it('keys include actual locked pieces and reject a goal with displaced locks', () => {
  const goals = blockGoals(engine),
    goal = goals.find((g) => g.side === 'right' && g.phase === 'base')!;
  const held = rouxReferenceState(engine),
    wrong = engine.apply(held, ['L']);
  expect(blockStateKey(engine, held, goal)).not.toBe(blockStateKey(engine, wrong, goal));
  expect(
    planBlockGoal(engine, wrong, goal, generateBlockPolicies(engine), createRouxBudget()).ok,
  ).toBe(false);
});
it('plans a real slice setup with accurate target movement and no redundant inverse pair', () => {
  const goal = blockGoals(engine).find((g) => g.side === 'right' && g.phase === 'pair')!;
  const held = rouxReferenceState(engine),
    input = engine.apply(held, ['R', 'U', "R'", 'M']);
  const result = planBlockGoal(
    engine,
    input,
    goal,
    generateBlockPolicies(engine),
    createRouxBudget(),
  );
  expect(result.ok).toBe(true);
  assertRouxActions(engine, input, result);
  if (!result.ok) return;
  expect(result.actions.length).toBeGreaterThan(0);
  expect(result.actions.every((a) => a.roux.protectedIds.length > 0)).toBe(true);
});
