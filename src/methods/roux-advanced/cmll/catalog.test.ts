import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { ROUX_FRAMES } from '../frames';
import { createRouxSearchBudget } from '../budget';
import { CMLL_CATALOG, cmllDigest } from './catalog';
import { admitCmllCatalog } from './admission';
import { recognizeCmll } from './recognize';
import { planCmllVariants } from './plan';
import { assertAdvancedDrafts } from '../../../../tests/helpers/advanced-roux';
import { observeAdvancedFrame } from '../predicates';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
const frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
const budget = () => createRouxSearchBudget('lab', { now: () => 0 });
it('admits 42 cases with exact family counts and feasible execution profiles', () => {
  expect(CMLL_CATALOG.cases).toHaveLength(42);
  const counts: Record<string, number> = {};
  for (const c of CMLL_CATALOG.cases) counts[c.family] = (counts[c.family] ?? 0) + 1;
  expect(counts).toEqual({ O: 2, H: 4, Pi: 6, U: 6, T: 6, Sune: 6, 'Anti-Sune': 6, L: 6 });
  expect(() => admitCmllCatalog(e, CMLL_CATALOG, budget())).not.toThrow();
  expect(Object.values(CMLL_CATALOG.variants).filter((v) => v.default)).toHaveLength(42);
});
it('uses side permutation, not just top stickers, and recognizes solved corners', () => {
  const states = CMLL_CATALOG.cases
    .filter((c) => c.family === 'O')
    .map((c) =>
      e.apply(
        e.apply(e.solved(), frame.positioningMoves),
        invertTeachingMoves(CMLL_CATALOG.variants[c.variantIds[0]].moves),
      ),
    );
  const top = (s: (typeof states)[number]) =>
    e
      .observe(s)
      .corners.filter((p) => p.slot.includes('U'))
      .map((p) => p.stickers.U);
  expect(top(states[0])).toEqual(top(states[1]));
  expect(recognizeCmll(e, states[0], frame).caseId).not.toBe(
    recognizeCmll(e, states[1], frame).caseId,
  );
  expect(
    recognizeCmll(e, e.apply(e.solved(), [...frame.positioningMoves, 'U', 'M']), frame).caseId,
  ).toBe('solved');
});
it('replays admitted alternatives in every frame and center phase', () => {
  for (const f of ROUX_FRAMES)
    for (const phase of [0, 1, 2, 3])
      for (const c of CMLL_CATALOG.cases) {
        const variant = CMLL_CATALOG.variants[c.variantIds[0]];
        const start = e.apply(e.solved(), [
          ...f.positioningMoves,
          ...Array(phase).fill('M'),
          ...invertTeachingMoves(variant.moves),
          'U',
        ]);
        expect(recognizeCmll(e, start, f).caseId).toBe(c.id);
        const options = planCmllVariants(e, start, f, CMLL_CATALOG, budget());
        expect(options.length).toBeGreaterThan(0);
        expect(options.length).toBeLessThanOrEqual(8);
        for (const option of options) {
          expect(e.equals(assertAdvancedDrafts(e, start, option.actions, f), option.state)).toBe(
            true,
          );
          expect(observeAdvancedFrame(e, option.state, f).cornerOffset).not.toBeNull();
        }
      }
}, 120000);
it('rejects corrupt effects, impossible corner states and a broken block', () => {
  const bad = structuredClone(CMLL_CATALOG),
    variant = Object.values(bad.variants)[0];
  Object.assign(variant, { centerPhaseDelta: (variant.centerPhaseDelta + 1) % 4 });
  bad.digest = cmllDigest(bad);
  expect(() => admitCmllCatalog(e, bad, budget())).toThrow(/center phase/);
  const state = structuredClone(e.apply(e.solved(), frame.positioningMoves));
  state.data.CORNERS.orientation[0] = (state.data.CORNERS.orientation[0] + 1) % 3;
  expect(() => recognizeCmll(e, state, frame)).toThrow(/legal|orientation/);
  expect(() =>
    recognizeCmll(e, e.apply(e.solved(), [...frame.positioningMoves, 'R']), frame),
  ).toThrow(/block/);
});
it('does not trust a shallow-frozen catalog after nested effect data changes', () => {
  const copy = structuredClone(CMLL_CATALOG);
  Object.freeze(copy.variants);
  Object.freeze(copy);
  admitCmllCatalog(e, copy, budget());
  const effect = Object.values(copy.variants)[0].edgeTransform.orientationDelta as number[];
  effect[0] ^= 1;
  expect(() => admitCmllCatalog(e, copy, budget())).toThrow();
});
it('rejects out-of-range raw orientations before color mapping can normalize them', () => {
  const state = structuredClone(e.apply(e.solved(), frame.positioningMoves));
  state.data.CORNERS.orientation[0] += 3;
  expect(() => recognizeCmll(e, state, frame)).toThrow();
});
