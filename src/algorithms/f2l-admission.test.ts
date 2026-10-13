import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, TeachingMove } from '../core/types';
import { enumerateF2LCandidates, compareImmediate } from '../methods/advanced/f2l/candidates';
import { F2L_CATALOG } from './data/f2l';
import { admitRegistry } from './admission';
import { getCaseFixture, verifyCaseFixture } from './fixtures';
import { observeF2LPairs, preservesF2L } from '../methods/cfop/f2l-cases';
import { f2lSignature } from '../methods/advanced/f2l/recognize';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('admits_41_cases_in_four_slots', () => {
  const cases = Object.values(F2L_CATALOG.cases);
  expect(cases).toHaveLength(41);
  admitRegistry(F2L_CATALOG);
  expect(new Set(cases.map((c) => c.canonicalSignature)).size).toBe(41);
  for (const c of cases) {
    const variants = c.variantIds.map((id) => F2L_CATALOG.variants[id]);
    expect([...new Set(variants.map((v) => v.targetSlot))].sort()).toEqual([
      'BL',
      'BR',
      'FL',
      'FR',
    ]);
    expect(variants.filter((v) => v.id === c.defaultVariantId)).toHaveLength(1);
    for (const variant of variants) {
      const fixture = c.fixtureIds
        .map(getCaseFixture)
        .find(
          (f) =>
            f?.target &&
            f.target.slot === variant.targetSlot &&
            f2lSignature(engine, f.initial, f.target) === variant.startSignature,
        );
      expect(fixture, variant.id).toBeDefined();
      verifyCaseFixture(engine, fixture!);
      const after = engine.apply(fixture!.initial, variant.moves);
      expect(
        observeF2LPairs(engine, after).find((p) => p.cornerId === fixture!.target!.cornerId)
          ?.solved,
        variant.id,
      ).toBe(true);
      expect(preservesF2L(engine, fixture!.initial, after), variant.id).toBe(true);
    }
  }
});
it('rejects_tampered_physical_setup', () => {
  const c = Object.values(F2L_CATALOG.cases)[0];
  expect(c).toBeDefined();
  const fixture = getCaseFixture(c.fixtureIds[0])!;
  expect(() => verifyCaseFixture(engine, { ...fixture, setup: [...fixture.setup, 'R'] })).toThrow();
});
it('replays all 41 cases in four slots and four actual holding frames', () => {
  for (const c of Object.values(F2L_CATALOG.cases))
    for (const slot of ['fr', 'fl', 'br', 'bl']) {
      const f = getCaseFixture(c.id + '/' + slot + '/u0')!;
      for (const y of [[], ['y'], ["y'"], ['y2']] as TeachingMove[][]) {
        const initial = engine.apply(f.initial, y);
        const chosen = enumerateF2LCandidates(engine, initial, f.target!).sort(compareImmediate)[0];
        const replay = engine.apply(
          initial,
          chosen.actions.flatMap((a) => a.moves),
        );
        expect(engine.equals(replay, chosen.after), c.id + ' ' + slot + ' ' + y).toBe(true);
        if (c.id === 'f2l-20' && slot === 'br' && y.length === 0) {
          const changed = chosen.actions.flatMap((a) => a.moves);
          changed[0] = changed[0] === 'y' ? 'y2' : 'y';
          expect(engine.equals(engine.apply(initial, changed), chosen.after)).toBe(false);
        }
        expect(preservesF2L(engine, initial, replay)).toBe(true);
        expect(
          observeF2LPairs(engine, replay).find((p) => p.cornerId === f.target!.cornerId)!.solved,
        ).toBe(true);
      }
    }
}, 120000);
