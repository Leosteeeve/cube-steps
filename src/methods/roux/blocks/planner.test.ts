import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { createRouxBudget } from '../budget';
import { blockGoals, generateBlockPolicies } from './policies';
import { planBlockGoal } from './planner';
import { assertRouxActions } from '../../../../tests/helpers/roux';
import type { RouxBlockPolicies } from './types';
let engine: CubeEngine, policies: RouxBlockPolicies;
beforeAll(async () => {
  engine = await createCubeEngine();
  policies = generateBlockPolicies(engine);
});
it('skips a completed target without normalizing middle centers', () => {
  const initial = engine.apply(rouxReferenceState(engine), ['M']);
  const result = planBlockGoal(
    engine,
    initial,
    blockGoals(engine)[0],
    policies,
    createRouxBudget(),
  );
  expect(result).toMatchObject({ ok: true, actions: [] });
  if (result.ok) expect(result.state).toEqual(initial);
});
it('reports a bounded failure without returning a partial success', () => {
  const initial = engine.apply(rouxReferenceState(engine), ['L']);
  expect(
    planBlockGoal(
      engine,
      initial,
      blockGoals(engine)[0],
      policies,
      createRouxBudget({ maxNodes: 0 }),
    ),
  ).toMatchObject({ ok: false, code: 'budget', stageId: 'roux-first-block' });
});
it('replays a deterministic complete route with exact formula boundaries', () => {
  const initial = engine.apply(rouxReferenceState(engine), ['R', 'U', "R'", 'M', 'U2']);
  const goal = blockGoals(engine).find((g) => g.side === 'right' && g.phase === 'pair')!;
  const a = planBlockGoal(engine, initial, goal, policies, createRouxBudget());
  const b = planBlockGoal(engine, initial, goal, policies, createRouxBudget());
  assertRouxActions(engine, initial, a);
  if (!a.ok || !b.ok) throw Error('No route');
  expect(a.actions.map((x) => x.moves)).toEqual(b.actions.map((x) => x.moves));
  expect(a.actions.filter((x) => x.kind === 'algorithm').every((x) => x.moves.length === 3)).toBe(
    true,
  );
});
