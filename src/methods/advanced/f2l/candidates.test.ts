import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { enumerateF2LCandidates } from './candidates';
import { getCaseFixture } from '../../../algorithms/fixtures';
import { ALGORITHM_REGISTRY } from '../../../algorithms/registry';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
import { DEFAULT_F2L_LIMITS } from './types';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('chooses_pair_from_actual_state', () => {
  const slots = new Set<string>();
  let rotations = 0;
  for (const id of ['f2l-01', 'f2l-02', 'f2l-20', 'f2l-41'])
    for (const slot of ['fr', 'fl', 'br', 'bl']) {
      const fixture = getCaseFixture(`${id}/${slot}/u1`)!;
      const candidates = enumerateF2LCandidates(engine, fixture.initial, fixture.target!);
      expect(candidates.length).toBeGreaterThan(0);
      for (const candidate of candidates) {
        slots.add(candidate.target.slot);
        expect(candidate.caseId).toBe(id);
        expect(
          engine.equals(
            engine.apply(
              fixture.initial,
              candidate.actions.flatMap((a) => a.moves),
            ),
            candidate.after,
          ),
        ).toBe(true);
        expect(
          observeF2LPairs(engine, candidate.after).find(
            (p) => p.cornerId === fixture.target!.cornerId,
          )!.solved,
        ).toBe(true);
        expect(preservesF2L(engine, fixture.initial, candidate.after)).toBe(true);
        let turns = 0,
          regrips = 0;
        for (const a of candidate.actions) {
          for (const m of a.moves) {
            if (/^[xyz]/.test(m)) regrips++;
            else turns += /^[MES]/.test(m) ? 2 : 1;
          }
          if (a.kind === 'algorithm')
            expect(a.moves).toEqual(
              (
                ALGORITHM_REGISTRY.variants[a.algorithmId!] ??
                ALGORITHM_REGISTRY.preparations[a.algorithmId!]
              ).moves,
            );
        }
        rotations += regrips;
        expect(candidate.metrics.faceTurns).toBe(turns);
        expect(candidate.metrics.rotations).toBe(regrips);
        expect(candidate.metrics.effort).toBe(turns + regrips);
      }
    }
  expect(slots.size).toBe(4);
  expect(rotations).toBeGreaterThan(0);
});
it('fails_bounded_preparation', () => {
  const fixture = getCaseFixture('f2l-01/fr/u0')!;
  expect(() =>
    enumerateF2LCandidates(engine, fixture.initial, fixture.target!, {
      ...DEFAULT_F2L_LIMITS,
      maxCandidatesPerTarget: 0,
    }),
  ).toThrow(/budget/i);
  expect(() =>
    enumerateF2LCandidates(engine, fixture.initial, fixture.target!, {
      ...DEFAULT_F2L_LIMITS,
      maxSimulations: 0,
    }),
  ).toThrow(/budget/i);
});
