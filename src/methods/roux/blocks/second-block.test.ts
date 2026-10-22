import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { blockComplete } from '../predicates';
import { createRouxBudget } from '../budget';
import { generateBlockPolicies } from './policies';
import { planSecondBlock } from './second-block';
import type { RouxBlockPolicies } from './types';
import { assertRouxActions } from '../../../../tests/helpers/roux';
import { rouxFixture } from '../../../../tests/fixtures/roux-cases';
let engine: CubeEngine, policies: RouxBlockPolicies;
beforeAll(async () => {
  engine = await createCubeEngine();
  policies = generateBlockPolicies(engine);
});
it('uses M-prime for the actual white-green target while protecting the left block', () => {
  const initial = rouxFixture(engine, 'second-block-slice-assist'),
    result = planSecondBlock(engine, initial, policies, createRouxBudget());
  assertRouxActions(engine, initial, result);
  if (!result.ok) throw Error(result.message);
  expect(result.actions[0].moves).toEqual(["M'"]);
  expect(result.actions[0].targets).toEqual(['UF']);
  expect(result.actions[0].explanation).toContain('green-white');
});
it.each([
  [
    ['R', 'U', "R'"],
    ['UFR', 'FR'],
  ],
  [
    ["R'", 'U', 'R'],
    ['ULF', 'FL'],
  ],
] as [TeachingMove[], string[]][])('uses the front or rear target as needed', (moves, ids) => {
  const result = planSecondBlock(
    engine,
    engine.apply(rouxReferenceState(engine), moves),
    policies,
    createRouxBudget(),
  );
  if (!result.ok) throw Error(result.message);
  expect(result.actions).toHaveLength(1);
  expect(result.actions[0].targets).toEqual(ids);
});
it.each([
  ['R', 'U', "R'"],
  ["R'", 'U', 'R'],
  ['R2', 'U', 'M'],
  ['R', 'U2', "R'", "M'", 'R2', 'U2'],
] as TeachingMove[][])(
  'protects the complete left block for every physical turn: %j',
  (...moves) => {
    const initial = engine.apply(rouxReferenceState(engine), moves as TeachingMove[]),
      result = planSecondBlock(engine, initial, policies, createRouxBudget());
    assertRouxActions(engine, initial, result);
    if (!result.ok) throw Error(result.message);
    let state = initial;
    for (const action of result.actions)
      for (const move of action.moves) {
        state = engine.apply(state, [move]);
        expect(blockComplete(engine, state, 'left')).toBe(true);
        expect(move).toMatch(/^[RUM]/);
      }
    expect(blockComplete(engine, state, 'right')).toBe(true);
  },
);
it('preserves all four center phases and rejects an incomplete left block', () => {
  for (const moves of [[], ['M'], ['M2'], ["M'"]] as TeachingMove[][]) {
    const initial = engine.apply(rouxReferenceState(engine), moves);
    expect(planSecondBlock(engine, initial, policies, createRouxBudget())).toMatchObject({
      ok: true,
      state: initial,
      actions: [],
    });
  }
  expect(
    planSecondBlock(
      engine,
      engine.apply(rouxReferenceState(engine), ['L']),
      policies,
      createRouxBudget(),
    ),
  ).toMatchObject({ ok: false, stageId: 'roux-second-block' });
});
