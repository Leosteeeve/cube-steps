import { expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import { rouxReferenceState } from '../frame';
import { createRouxBudget } from '../budget';
import { planCornerOrientation, planCornerPermutation } from './plan';
it('rejects missing blocks and a zero search budget at the correct stage', async () => {
  const e = await createCubeEngine(),
    s = rouxReferenceState(e);
  expect(planCornerOrientation(e, e.apply(s, ['R']), createRouxBudget())).toMatchObject({
    ok: false,
    stageId: 'roux-corner-orientation',
  });
  expect(
    planCornerPermutation(e, e.apply(s, ['U']), createRouxBudget({ maxNodes: 0 })),
  ).toMatchObject({ ok: false, code: 'budget', stageId: 'roux-corner-permutation' });
});
