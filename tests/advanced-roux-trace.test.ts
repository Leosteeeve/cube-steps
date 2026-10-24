import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine } from '../src/core/types';
import type { AdvancedRouxAssets } from '../src/methods/roux-advanced/assets';
import { loadTestAdvancedRouxAssets } from './helpers/roux-advanced-assets';
import { runAdvancedRouxFixture, advancedRouxScramble } from './helpers/advanced-roux-corpus';
import { validateRouxRoute } from '../src/methods/roux-advanced/validate';
import { ROUX_FRAMES } from '../src/methods/roux-advanced/frames';
import { firstBlockLowerBound } from '../src/methods/roux-advanced/blocks/distance';
import { readFirstBlockCoordinate } from '../src/methods/roux-advanced/blocks/coordinates';
import { createRouxSearchBudget } from '../src/methods/roux-advanced/budget';
let e: CubeEngine, assets: AdvancedRouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
});
it('cannot corrupt active proof bounds by changing the public asset bytes', () => {
  const frame = ROUX_FRAMES[0],
    state = e.apply(e.apply(e.solved(), advancedRouxScramble(8)), frame.positioningMoves),
    coordinate = readFirstBlockCoordinate(e, state, frame),
    before = firstBlockLowerBound(e, state, frame, assets.blocks);
  const original = assets.blocks.distances[coordinate];
  try {
    assets.blocks.distances[coordinate] = (original + 1) % 9;
    expect(firstBlockLowerBound(e, state, frame, assets.blocks)).toBe(before);
  } finally {
    assets.blocks.distances[coordinate] = original;
  }
});
it('rejects deliberate endpoint, center and evidence corruption of complete routes', () => {
  const { route } = runAdvancedRouxFixture(
    e,
    assets,
    { kind: 'scramble', moves: advancedRouxScramble(15) },
    'yellow-red',
  );
  for (const corrupt of [
    (r: typeof route) => {
      r.trace.final.data.EDGES.orientation[0] ^= 1;
    },
    (r: typeof route) => {
      r.trace.final.data.CENTERS.pieces.reverse();
    },
    (r: typeof route) => {
      r.evidence = {
        status: 'best-found',
        lowerBound: 0,
        upperBound: 1,
        witness: ['R'],
        completedDepth: -1,
      };
    },
    (r: typeof route) => {
      r.counts.first++;
    },
  ]) {
    const bad = structuredClone(route);
    corrupt(bad);
    expect(() => validateRouxRoute(e, bad, assets)).toThrow();
  }
  expect(validateRouxRoute(e, route, assets).id).toBe(route.id);
});
it('admits representative complete snapshots within the independent normal-client allocation', () => {
  for (const [index, frame] of ROUX_FRAMES.entries()) {
    const { route } = runAdvancedRouxFixture(
        e,
        assets,
        { kind: 'scramble', moves: advancedRouxScramble(3100 + index) },
        frame.id,
      ),
      budget = createRouxSearchBudget('normal', {
        now: () => 0,
        maxOperations: 100000,
        maxEntries: 100,
        maxRetainedBytes: 32 * 1024 * 1024,
      });
    expect(validateRouxRoute(e, route, assets, budget).id).toBe(route.id);
    expect(budget.snapshot().operations).toBeLessThanOrEqual(100000);
  }
});
