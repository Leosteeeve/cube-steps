import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { chooseF2LCandidate } from './select';
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
  const score = selected.immediateCost + 0.5 * selected.nextCost;
  for (const pair of observeF2LPairs(engine, state).filter((p) => !p.solved)) {
    const candidates = enumerateF2LCandidates(engine, state, pair as never)
      .sort(
        (a, b) =>
          a.immediateCost - b.immediateCost ||
          a.variantId.localeCompare(b.variantId) ||
          a.actions
            .flatMap((x) => x.moves)
            .join(' ')
            .localeCompare(b.actions.flatMap((x) => x.moves).join(' ')),
      )
      .slice(0, 8);
    for (const first of candidates) {
      const nextCosts = observeF2LPairs(engine, first.after)
        .filter((p) => !p.solved)
        .flatMap((next) =>
          enumerateF2LCandidates(engine, first.after, next as never).map((c) => c.immediateCost),
        );
      const next = nextCosts.length ? Math.min(...nextCosts) : 0;
      expect(score).toBeLessThanOrEqual(first.immediateCost + 0.5 * next);
    }
  }
  const again = chooseF2LCandidate(engine, state);
  expect(JSON.stringify(again)).toBe(JSON.stringify(selected));
  expect(() =>
    chooseF2LCandidate(engine, state, { ...DEFAULT_F2L_LIMITS, maxSimulations: 1 }),
  ).toThrow(/budget/i);
});
