import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { blockComplete, blockTargets } from '../predicates';
import { createRouxBudget } from '../budget';
import { generateBlockPolicies } from './policies';
import { planFirstBlock } from './first-block';
import type { RouxBlockPolicies } from './types';
import { assertRouxActions } from '../../../../tests/helpers/roux';
import { rouxFixture } from '../../../../tests/fixtures/roux-cases';
let engine: CubeEngine, policies: RouxBlockPolicies;
beforeAll(async () => {
  engine = await createCubeEngine();
  policies = generateBlockPolicies(engine);
});
it('uses M to transport the white-blue base edge without a decorative inverse pair', () => {
  const initial = rouxFixture(engine, 'first-block-slice-assist'),
    result = planFirstBlock(engine, initial, policies, createRouxBudget());
  assertRouxActions(engine, initial, result);
  if (!result.ok) throw Error(result.message);
  expect(result.actions.map((a) => a.moves)).toEqual([['M'], ["D'"]]);
  expect(result.actions[0].targets).toEqual(['UB']);
  expect(result.actions[0].explanation).toContain('middle slice');
});
it.each([
  [
    ["L'", 'U', 'L'],
    ['URB', 'BR'],
  ],
  [
    ['L', 'U', "L'"],
    ['UBL', 'BL'],
  ],
] as [TeachingMove[], string[]][])(
  'chooses the needed front or rear pair without disturbing the complete pair',
  (moves, ids) => {
    const result = planFirstBlock(
      engine,
      engine.apply(rouxReferenceState(engine), moves),
      policies,
      createRouxBudget(),
    );
    if (!result.ok) throw Error(result.message);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].targets).toEqual(ids);
  },
);
it.each([
  ['base edge displaced', ['L']],
  ['front pair out', ["L'", 'U', 'L']],
  ['rear pair out', ['L', 'U', "L'"]],
  ['separated and trapped pieces', ['F', 'U2', 'B', 'L2', 'D']],
] as [string, TeachingMove[]][])('builds the left block: %s', (_, moves) => {
  const initial = engine.apply(rouxReferenceState(engine), moves),
    result = planFirstBlock(engine, initial, policies, createRouxBudget());
  assertRouxActions(engine, initial, result);
  if (!result.ok) throw Error(result.message);
  expect(blockComplete(engine, result.state, 'left')).toBe(true);
  expect(result.actions.flatMap((a) => a.moves).some((m) => /^[xyz]/.test(m))).toBe(false);
  expect(
    result.actions.every((a) =>
      a.targets.every((id) => blockTargets(engine, 'left').some((p) => p.id === id)),
    ),
  ).toBe(true);
});
it('repairs a legally flipped base edge', () => {
  const initial = structuredClone(rouxReferenceState(engine));
  initial.data.EDGES.orientation[7] ^= 1;
  initial.data.EDGES.orientation[0] ^= 1;
  const result = planFirstBlock(engine, initial, policies, createRouxBudget());
  assertRouxActions(engine, initial, result);
  if (result.ok) expect(blockComplete(engine, result.state, 'left')).toBe(true);
});
it('skips a complete block in each M phase and rejects the input hold', () => {
  for (const moves of [[], ['M'], ['M2'], ["M'"]] as TeachingMove[][]) {
    const initial = engine.apply(rouxReferenceState(engine), moves);
    expect(planFirstBlock(engine, initial, policies, createRouxBudget())).toMatchObject({
      ok: true,
      state: initial,
      actions: [],
    });
  }
  expect(planFirstBlock(engine, engine.solved(), policies, createRouxBudget())).toMatchObject({
    ok: false,
    stageId: 'roux-first-block',
  });
});
