import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine } from '../src/core/types';
import type { AdvancedRouxAssets } from '../src/methods/roux-advanced/assets';
import { ROUX_FRAMES } from '../src/methods/roux-advanced/frames';
import { prepareRouxInput } from '../src/methods/roux-advanced/input';
import { searchAdvancedRoux } from '../src/methods/roux-advanced/search';
import { createRouxSearchBudget } from '../src/methods/roux-advanced/budget';
import { loadTestAdvancedRouxAssets } from './helpers/roux-advanced-assets';
import {
  runAdvancedRouxFixture,
  advancedRouxScramble,
  inspectRouxWaste,
  assertAdvancedRouxReplay,
} from './helpers/advanced-roux-corpus';
import { rouxStageConnection } from '../src/player/roux-stage-connections';
let e: CubeEngine, assets: AdvancedRouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
});
it('explains the real second-block/CMLL checkpoint before connecting two R-prime turns', () => {
  const { route } = runAdvancedRouxFixture(
    e,
    assets,
    { kind: 'scramble', moves: advancedRouxScramble(15) },
    'white-orange',
  );
  expect(rouxStageConnection(route.trace, 3)).toContain(
    "R' finishes the previous stage and R' starts this one",
  );
  expect(rouxStageConnection(route.trace, 3)).toContain('connect them as R2');
});
it('has no unexplained physical loops or reducible action boundaries in a representative set', () => {
  for (const seed of [0, 1, 15, 27, 43, 99])
    for (const frame of ROUX_FRAMES) {
      const r = runAdvancedRouxFixture(
        e,
        assets,
        { kind: 'scramble', moves: advancedRouxScramble(seed) },
        frame.id,
      );
      expect(inspectRouxWaste(e, r.route), `${seed}/${frame.id}`).toEqual({
        loops: [],
        boundaries: [],
      });
    }
}, 90000);
it('keeps deterministic operation-limited optional results complete and replayable', () => {
  const reports: unknown[] = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const input = prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'U', "F'"] }),
      budget = createRouxSearchBudget('normal', { now: () => 0, maxOperations: 120000 }),
      run = searchAdvancedRoux(
        e,
        input,
        { allowedFrames: ['white-blue'], mode: 'normal', modelVersion: 'roux-execution-v1' },
        assets,
        budget,
      );
    let next = run.next();
    while (!next.done) {
      if (next.value.kind === 'result') assertAdvancedRouxReplay(e, next.value.route, assets);
      next = run.next();
    }
    expect(next.value.ok).toBe(true);
    reports.push(next.value);
  }
  expect(reports[1]).toEqual(reports[0]);
});
