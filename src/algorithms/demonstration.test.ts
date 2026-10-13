import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { getCaseFixture } from './fixtures';
import { ALGORITHM_REGISTRY } from './registry';
import { createDemonstration, verifyDemonstration } from './demonstration';
import { createPlaybackTimeline } from '../player/playback-timeline';
import { firstTwoLayersSolved } from '../methods/shared/pieces';
import { observeF2LPairs } from '../methods/cfop/f2l-cases';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('completes_one_f2l_pair_while_other_pairs_remain_unsolved', () => {
  const fixture = getCaseFixture('f2l-01/fr/mixed/u0');
  expect(fixture).toBeDefined();
  const demo = createDemonstration(engine, fixture!, 'f2l-01/main/fr');
  expect(observeF2LPairs(engine, demo.initial).filter((p) => p.solved)).toHaveLength(1);
  expect(observeF2LPairs(engine, demo.final).filter((p) => p.solved)).toHaveLength(2);
  expect(demo.checkpoint.passed).toBe(true);
  expect(firstTwoLayersSolved(engine, demo.final)).toBe(false);
});
it('names the resulting physical hold without rotating back after the formula', () => {
  const demo = createDemonstration(engine, getCaseFixture('f2l-20/br/u0')!, 'f2l-20/main/fr');
  const regrip = demo.actions.find((a) => a.kind === 'regrip')!;
  expect(regrip.explanation).toContain(engine.observe(regrip.after).centers.F + ' in front');
  expect(regrip.explanation).toContain('Continue');
  expect(demo.actions.at(-1)!.algorithmId).toBe('f2l-20/main/fr');
});
it('plays_oll_without_claiming_cube_solved', () => {
  const demo = createDemonstration(engine, getCaseFixture('oll-45/u0')!, 'oll-45/main');
  expect(demo.checkpoint.passed).toBe(true);
  expect(demo.checkpoint.description).toMatch(/OLL/);
  expect(firstTwoLayersSolved(engine, demo.final)).toBe(true);
  expect(engine.isSolved(demo.final)).toBe(false);
  expect(demo.actions.filter((a) => a.kind === 'algorithm')).toHaveLength(1);
  const timeline = createPlaybackTimeline(engine, { kind: 'algorithm', demonstration: demo });
  expect(timeline.completion.title).toBe('Algorithm complete.');
  expect(
    timeline.sections.every((s) => s.id === 'algorithm-setup' || s.id === 'algorithm-formula'),
  ).toBe(true);
  expect(timeline.states).toHaveLength(timeline.moves.length + 1);
  expect(engine.equals(timeline.states.at(-1)!, demo.final)).toBe(true);
});
it('rejects_wrong_case_variant_or_setup', () => {
  const fixture = getCaseFixture('oll-45/u0')!;
  expect(() => createDemonstration(engine, fixture, 'oll-01/main')).toThrow();
  expect(() =>
    createDemonstration(engine, { ...fixture, setup: [...fixture.setup, 'R'] }, 'oll-45/main'),
  ).toThrow();
  const demo = createDemonstration(engine, fixture, 'oll-45/main');
  for (const change of [
    (d: typeof demo) => {
      d.caseId = 'oll-01';
    },
    (d: typeof demo) => {
      d.fixtureId = 'oll-45/u1';
    },
    (d: typeof demo) => {
      d.variantId = 'oll-01/main';
    },
    (d: typeof demo) => {
      d.final = engine.solved();
    },
    (d: typeof demo) => {
      d.actions.at(-1)!.moves.push('R');
    },
    (d: typeof demo) => {
      d.actions.at(-1)!.checkpoint.passed = false;
    },
  ]) {
    const invalid = structuredClone(demo);
    change(invalid);
    expect(() => verifyDemonstration(engine, invalid)).toThrow();
  }
});
it('matches_each_variant_in_its_actual_holding_frame', () => {
  for (const c of Object.values(ALGORITHM_REGISTRY.cases)) {
    const fixture = getCaseFixture(c.fixtureIds[0])!;
    for (const variantId of c.variantIds) {
      const demo = createDemonstration(engine, fixture, variantId);
      expect(() => verifyDemonstration(engine, demo), variantId).not.toThrow();
      expect(demo.checkpoint.passed, variantId).toBe(true);
      expect(demo.actions.at(-1)?.moves).toEqual(ALGORITHM_REGISTRY.variants[variantId].moves);
      expect(
        engine.equals(
          engine.apply(engine.solved(), [...demo.setup, ...demo.holdingMoves]),
          demo.initial,
        ),
      ).toBe(true);
    }
  }
}, 120000);

it.each(['oll-26/u1', 'pll-ua/u1', 'f2l-01/fr/u1'])(
  'grounds demonstration preparation in its actual state for %s',
  (id) => {
    const fixture = getCaseFixture(id)!;
    const c = ALGORITHM_REGISTRY.cases[fixture.caseId];
    const variant = c.family === 'f2l' ? 'f2l-01/main/br' : c.defaultVariantId;
    const demo = createDemonstration(engine, fixture, variant);
    const preparations = demo.actions.filter((a) => a.kind !== 'algorithm');
    expect(preparations.length).toBeGreaterThan(0);
    for (const action of preparations) {
      const o = engine.observe(action.before);
      for (const p of [...o.edges, ...o.corners].filter((p) => action.targets.includes(p.id))) {
        for (const [face, color] of Object.entries(p.stickers)) {
          if (c.family === 'oll' && color !== 'yellow') continue;
          if (c.family === 'pll' && face === 'U') continue;
          expect(action.recognition).toContain(`${p.slot}: ${color} on ${face}`);
        }
      }
    }
  },
);
