import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { chooseF2LCandidate, selectF2LShortlist } from './select';
import { enumerateF2LCandidates } from './candidates';
import { observeF2LPairs } from '../../cfop/f2l-cases';
import { seededScramble } from '../../../../tests/fixtures/lbl-cases';
import { generateCrossTable } from '../cross/generate';
import { planShortestCross } from '../cross/solve';
import { DEFAULT_F2L_LIMITS } from './types';
let engine: CubeEngine;
const table = generateCrossTable();
beforeAll(async () => {
  engine = await createCubeEngine();
});
function crossed(seed: number) {
  const s = engine.apply(engine.solved(), seededScramble(seed)),
    p = planShortestCross(engine, s, table);
  return engine.apply(s, [...p.holdingMoves, ...p.moves]);
}
it('chooses_pair_from_actual_state_instead_of_fixed_order', () => {
  let different = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const state = crossed(seed),
      selected = chooseF2LCandidate(engine, state),
      pairs = observeF2LPairs(engine, state);
    expect(selected.actions.length).toBeGreaterThan(0);
    expect(pairs.find((p) => p.cornerId === selected.target.cornerId)?.solved).toBe(false);
    if (selected.target.cornerId !== pairs.find((p) => !p.solved)!.cornerId) different++;
  }
  expect(different).toBeGreaterThan(0);
});
it('uses_next_pair_tie_break_and_is_deterministic', () => {
  const state = crossed(4),
    selected = chooseF2LCandidate(engine, state);
  expect(selected.compared).toBeGreaterThan(1);
  const tuple = (
    c: { quality: number; effort: number; rotations: number },
    n: { quality: number; effort: number },
  ) => [2 * c.quality + n.quality, 2 * c.effort + n.effort, c.quality, c.effort, c.rotations];
  const compare = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };
  const score = tuple(selected.metrics, selected.nextMetrics);
  for (const pair of observeF2LPairs(engine, state).filter((p) => !p.solved)) {
    for (const first of selectF2LShortlist(enumerateF2LCandidates(engine, state, pair as never))) {
      const nextOptions = observeF2LPairs(engine, first.after)
        .filter((p) => !p.solved)
        .flatMap((next) =>
          enumerateF2LCandidates(engine, first.after, next as never).map((c) => c.metrics),
        );
      nextOptions.sort(
        (a, b) => a.quality - b.quality || a.effort - b.effort || a.rotations - b.rotations,
      );
      expect(
        compare(score, tuple(first.metrics, nextOptions[0] ?? { quality: 0, effort: 0 })),
      ).toBeLessThanOrEqual(0);
    }
  }
  const again = chooseF2LCandidate(engine, state);
  expect(JSON.stringify(again)).toBe(JSON.stringify(selected));
  expect(() =>
    chooseF2LCandidate(engine, state, { ...DEFAULT_F2L_LIMITS, maxSimulations: 1 }),
  ).toThrow(/budget/i);
});
