import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { legalPLLPermutations } from '../../../tests/fixtures/advanced-last-layer';
import { recognizeAdvancedPLL } from './recognize-pll';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
import { firstTwoLayersSolved } from '../shared/pieces';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('recognizes_all_288_legal_pll_permutations', () => {
  const states = legalPLLPermutations(engine);
  expect(states).toHaveLength(288);
  const cases = new Set<string>();
  let skips = 0;
  const auf: TeachingMove[][] = [[], ['U'], ["U'"], ['U2']];
  for (const state of states) {
    const match = recognizeAdvancedPLL(engine, state),
      aligned = auf.some((u) => engine.isSolved(engine.apply(state, u)));
    if (aligned) {
      expect(match).toBeNull();
      skips++;
      continue;
    }
    expect(match).not.toBeNull();
    cases.add(match!.caseId);
    const after = engine.apply(state, [
      ...match!.setup,
      ...ALGORITHM_REGISTRY.variants[match!.variantId].moves,
    ]);
    expect(firstTwoLayersSolved(engine, after)).toBe(true);
    expect(
      auf.some((u) => engine.isSolved(engine.apply(after, u))),
      match!.caseId,
    ).toBe(true);
  }
  expect(cases.size).toBe(21);
  expect(skips).toBe(4);
});
it('requires_oll_and_f2l_before_pll_recognition', () => {
  expect(() => recognizeAdvancedPLL(engine, engine.apply(engine.solved(), ['R']))).toThrow();
  expect(() =>
    recognizeAdvancedPLL(
      engine,
      engine.apply(engine.solved(), ['z2', 'F', 'R', 'U', "R'", "U'", "F'"]),
    ),
  ).toThrow(/OLL|orientation/i);
});
