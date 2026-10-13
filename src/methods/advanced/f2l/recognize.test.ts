import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { recognizeAdvancedF2L } from './recognize';
import {
  canonicalTargets,
  admissiblePairPlacements,
} from '../../../../tests/fixtures/advanced-f2l';
import { observeF2LPairs } from '../../cfop/f2l-cases';
import { stateToFacelets, validateFacelets } from '../../../core/facelets';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('admits_41_cases_in_four_slots', () => {
  for (const target of canonicalTargets(engine)) {
    const ids = new Set<string>();
    for (const state of admissiblePairPlacements(engine, target)) {
      expect(
        validateFacelets(stateToFacelets(engine.apply(state, ['z2'])), engine.solved()).ok,
      ).toBe(true);
      const pair = observeF2LPairs(engine, state).find((p) => p.cornerId === target.cornerId)!;
      const match = recognizeAdvancedF2L(engine, state, target);
      if (pair.solved) expect(match).toBeNull();
      else {
        expect(match?.slot).toBe(target.slot);
        ids.add(match!.caseId);
      }
    }
    expect(ids.size).toBe(41);
  }
});
