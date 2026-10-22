import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { encodeLse } from './coordinates';
import { createLseModel, lseGoalReached, LSE_GENERATORS } from './model';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
it('uses actual engine transitions for each M/U generator', () => {
  const model = createLseModel(e);
  let state = rouxReferenceState(e);
  for (let i = 0; i < 60; i++) {
    for (const move of LSE_GENERATORS)
      expect(model.step(encodeLse(e, state)!, [move])).toEqual(
        encodeLse(e, e.apply(state, [move])),
      );
    state = e.apply(state, [LSE_GENERATORS[(i * 7 + Math.floor(i / 6)) % 6]]);
  }
});
it('distinguishes reference setup, edge orientation, relative placement and final alignment', () => {
  const reference = rouxReferenceState(e),
    shifted = e.apply(reference, ['U']);
  expect(lseGoalReached(e, shifted, 'left-right')).toBe(true);
  expect(lseGoalReached(e, shifted, 'solved')).toBe(false);
  expect(lseGoalReached(e, e.apply(reference, ['M']), 'orientation')).toBe(false);
  expect(lseGoalReached(e, e.apply(reference, ['M2']), 'orientation')).toBe(true);
  const swapped = structuredClone(reference);
  [swapped.data.EDGES.pieces[1], swapped.data.EDGES.pieces[3]] = [
    swapped.data.EDGES.pieces[3],
    swapped.data.EDGES.pieces[1],
  ];
  expect(lseGoalReached(e, swapped, 'left-right')).toBe(false);
});
