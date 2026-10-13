import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { enumerateF2LHolds } from './holding';
import { chooseF2LCandidate, selectF2LShortlist } from './select';
import { enumerateF2LCandidates } from './candidates';
import { getCaseFixture } from '../../../algorithms/fixtures';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
import { canonicalTargets, pairPlacement } from '../../../../tests/fixtures/advanced-f2l';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('rotates repeated back-face work but retains a visible easy rear insertion', () => {
  const awkward = getCaseFixture('f2l-20/br/u0')!,
    easy = getCaseFixture('f2l-02/br/u0')!;
  const selected = chooseF2LCandidate(engine, awkward.initial);
  expect(selected.actions.some((a) => a.ruleId === 'advanced-f2l-regrip')).toBe(true);
  expect(selected.metrics.quality).toBe(0);
  const retained = chooseF2LCandidate(engine, easy.initial);
  expect(retained.actions.flatMap((a) => a.moves)).toEqual(["R'", "U'", 'R']);
  expect(retained.metrics.rotations).toBe(0);
});
it('retains all continuation holds in the per-target shortlist', () => {
  const f = getCaseFixture('f2l-20/br/u0')!;
  const shortlist = selectF2LShortlist(enumerateF2LCandidates(engine, f.initial, f.target!));
  expect(new Set(shortlist.map((c) => c.frontColor)).size).toBe(4);
  expect(shortlist.length).toBeLessThanOrEqual(8);
});
it('tracks trapped piece identities independently of their rotated slots', () => {
  const target = canonicalTargets(engine).find((t) => t.slot === 'FR')!;
  const initial = pairPlacement(engine, target, 'DFL', 1, 'BR', 1);
  for (const spin of [[], ['y'], ["y'"], ['y2']] as TeachingMove[][]) {
    const state = engine.apply(initial, spin),
      holds = enumerateF2LHolds(engine, state, target);
    expect(new Set(holds.map((h) => engine.observe(h.state).centers.F)).size).toBe(4);
    for (const h of holds) {
      expect(h.target).toMatchObject({ cornerId: target.cornerId, edgeId: target.edgeId });
      expect(h.target.slot).toBe(
        observeF2LPairs(engine, h.state).find((p) => p.cornerId === target.cornerId)!.slot,
      );
      expect(preservesF2L(engine, state, h.state)).toBe(true);
    }
    const candidates = enumerateF2LCandidates(engine, state, target);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(preservesF2L(engine, state, c.after)).toBe(true);
      expect(
        observeF2LPairs(engine, c.after).find((p) => p.cornerId === target.cornerId)!.solved,
      ).toBe(true);
    }
  }
});
