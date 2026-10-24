import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine, SolveInput } from '../src/core/types';
import { stateToFacelets } from '../src/core/facelets';
import type { AdvancedRouxAssets } from '../src/methods/roux-advanced/assets';
import { ROUX_FRAMES } from '../src/methods/roux-advanced/frames';
import { prepareRouxInput } from '../src/methods/roux-advanced/input';
import { loadTestAdvancedRouxAssets } from './helpers/roux-advanced-assets';
import { runAdvancedRouxFixture, advancedRouxScramble } from './helpers/advanced-roux-corpus';
let e: CubeEngine, assets: AdvancedRouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
});
it('replays 16 independent color states in all eight frames with equivalent teaching moves', () => {
  for (let seed = 2000; seed < 2016; seed++) {
    const moves = advancedRouxScramble(seed),
      facelets = stateToFacelets(e.apply(e.solved(), moves));
    for (const frame of ROUX_FRAMES) {
      const a = runAdvancedRouxFixture(e, assets, { kind: 'scramble', moves }, frame.id).route,
        b = runAdvancedRouxFixture(e, assets, { kind: 'facelets', facelets }, frame.id).route;
      expect(b.trace.stages.map((s) => s.actions.map((a) => a.moves))).toEqual(
        a.trace.stages.map((s) => s.actions.map((a) => a.moves)),
      );
      expect(b.input.source).toEqual({ kind: 'facelets', facelets });
    }
  }
}, 180000);
it('rejects invalid notation, excessive input and impossible color snapshots', () => {
  const bad = structuredClone(e.solved());
  bad.data.EDGES.orientation[0] ^= 1;
  for (const source of [
    { kind: 'scramble', moves: ['X'] },
    { kind: 'scramble', moves: Array(1001).fill('R') },
    { kind: 'facelets', facelets: stateToFacelets(bad) },
    { kind: 'facelets', facelets: {} },
  ])
    expect(() => prepareRouxInput(e, source as SolveInput)).toThrow();
});
it('uses a short verified playback witness for a legal 1000-turn input', () => {
  const result = runAdvancedRouxFixture(
    e,
    assets,
    { kind: 'scramble', moves: Array(1000).fill('R') },
    'white-blue',
  );
  expect(
    result.route.input.source.kind === 'scramble' && result.route.input.source.moves.length,
  ).toBe(1000);
  expect(result.route.input.setupMoves!.length).toBeLessThanOrEqual(520);
});
