import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { firstTwoLayersSolved } from '../shared/pieces';
import { recognizeAdvancedOLL } from './recognize-oll';
import {
  legalOLLOrientations,
  permuteLastLayer,
} from '../../../tests/fixtures/advanced-last-layer';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
import { stateToFacelets, validateFacelets } from '../../core/facelets';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
function oriented(s: ReturnType<CubeEngine['solved']>) {
  const o = engine.observe(s);
  return [...o.edges, ...o.corners]
    .filter((p) => p.slot.includes('U'))
    .every((p) => p.stickers.U === 'yellow');
}
it('recognizes_all_216_legal_oll_orientations', () => {
  const states = legalOLLOrientations(engine);
  expect(states).toHaveLength(216);
  const ids = new Set<string>();
  let skips = 0;
  for (const state of states) {
    const base = recognizeAdvancedOLL(engine, state);
    if (oriented(state)) {
      expect(base).toBeNull();
      skips++;
      continue;
    }
    expect(base).not.toBeNull();
    ids.add(base!.caseId);
    for (const [corners, edges] of [
      [
        [0, 1, 2, 3],
        [0, 1, 2, 3],
      ],
      [
        [1, 0, 2, 3],
        [1, 0, 2, 3],
      ],
      [
        [1, 2, 0, 3],
        [2, 0, 1, 3],
      ],
    ]) {
      const permuted = permuteLastLayer(state, corners, edges);
      expect(
        validateFacelets(stateToFacelets(engine.apply(permuted, ['z2'])), engine.solved()).ok,
      ).toBe(true);
      const match = recognizeAdvancedOLL(engine, permuted)!;
      expect(match.caseId).toBe(base!.caseId);
      const variant = ALGORITHM_REGISTRY.variants[match.variantId];
      const after = engine.apply(permuted, [...match.setup, ...variant.moves]);
      expect(oriented(after), match.caseId).toBe(true);
      expect(firstTwoLayersSolved(engine, after)).toBe(true);
    }
  }
  expect(ids.size).toBe(57);
  expect(skips).toBe(1);
});
it('rejects_non_f2l_states_instead_of_claiming_an_oll_skip', () => {
  expect(() => recognizeAdvancedOLL(engine, engine.apply(engine.solved(), ['R']))).toThrow(
    /F2L|first two layers/i,
  );
});
