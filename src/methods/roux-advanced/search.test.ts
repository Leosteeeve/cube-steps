import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { loadTestAdvancedRouxAssets } from '../../../tests/helpers/roux-advanced-assets';
import { createRouxSearchBudget } from './budget';
import { prepareRouxInput } from './input';
import { searchAdvancedRoux } from './search';
import { validateRouxRoute } from './validate';
import { isRouxRecommendationEligible, selectRouxRoutes } from './selection';
import type { AdvancedRouxAssets } from './assets';
import type { AdvancedRouxOutcome, RouxRoute } from '../../roux-lab/types';
import { stateToFacelets } from '../../core/facelets';
import { ROUX_FRAMES } from './frames';
import { invertTeachingMoves } from '../../core/teaching-moves';
let e: CubeEngine, assets: AdvancedRouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
});
function stoppedAfterBaseline(): AdvancedRouxOutcome {
  let published = false;
  const b = createRouxSearchBudget('normal', { now: () => 0, cancelled: () => published });
  const run = searchAdvancedRoux(
    e,
    prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'U', "F'", 'L2', 'D'] }),
    { allowedFrames: ['white-blue'], mode: 'normal', modelVersion: 'roux-execution-v1' },
    assets,
    b,
  );
  for (;;) {
    const next = run.next();
    if (next.done) return next.value;
    if (next.value.kind === 'result') {
      validateRouxRoute(e, next.value.route, assets);
      published = true;
    }
  }
}
it('publishes a verified complete fallback before optional work and retains it when stopped', () => {
  const outcome = stoppedAfterBaseline();
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) throw Error(outcome.message);
  expect(outcome.routes.some((r) => r.basis === 'baseline-fallback')).toBe(true);
  expect(outcome.routes).toHaveLength(1);
  expect(outcome.coverage.reason).toBe('cancelled');
  expect(e.isSolved(outcome.routes[0].trace.final)).toBe(true);
});
it('keeps fallback availability separate from d+2 eligibility and tighter proof updates', () => {
  const outcome = stoppedAfterBaseline();
  if (!outcome.ok) throw Error(outcome.message);
  const baseline = outcome.routes[0],
    candidate = {
      ...baseline,
      id: 'optimized-test',
      basis: 'optimized' as const,
      counts: { ...baseline.counts, first: 5 },
    };
  const pending = {
    status: 'best-found' as const,
    lowerBound: 2,
    upperBound: 4,
    witness: ['F', 'U', 'L', 'D'] as const,
    completedDepth: 1,
  };
  const tighter = {
    status: 'proven-minimum' as const,
    minimum: 2,
    witness: ['F', 'U'] as const,
    proof: {
      coordinateVersion: 1 as const,
      moveSetVersion: 'roux-stm-v1' as const,
      completedDepth: 1,
      assetDigest: assets.blocks.digest,
    },
  };
  expect(isRouxRecommendationEligible(candidate, pending)).toBe(true);
  expect(isRouxRecommendationEligible(candidate, tighter)).toBe(false);
  expect(selectRouxRoutes([baseline, candidate], { 'white-blue': tighter }, 1)).toEqual([baseline]);
  expect(
    isRouxRecommendationEligible(
      { ...candidate, score: { rated: false, reason: 'Missing profile' } },
      pending,
    ),
  ).toBe(false);
});
it('handles already solved input, allowed frames and incomplete searches truthfully', () => {
  const input = prepareRouxInput(e, { kind: 'scramble', moves: [] });
  const run = searchAdvancedRoux(
    e,
    input,
    { allowedFrames: ['yellow-orange'], mode: 'normal', modelVersion: 'roux-execution-v1' },
    assets,
    createRouxSearchBudget('normal', { now: () => 0 }),
  );
  let outcome: AdvancedRouxOutcome | undefined;
  for (;;) {
    const next = run.next();
    if (next.done) {
      outcome = next.value;
      break;
    }
  }
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) throw Error(outcome.message);
  expect(outcome.routes[0].frameId).toBe('yellow-orange');
  expect(outcome.routes[0].trace.stages).toHaveLength(6);
  expect(outcome.routes[0].counts.combined).toBe(0);
  const stopped = searchAdvancedRoux(
    e,
    input,
    { allowedFrames: ['white-blue'], mode: 'normal', modelVersion: 'roux-execution-v1' },
    assets,
    createRouxSearchBudget('normal', { now: () => 0, maxOperations: 1 }),
  );
  let partial = stopped.next();
  while (!partial.done) partial = stopped.next();
  expect(partial.value.ok).toBe(false);
});
it('removes dominated execution choices while leaving unrated references out of comfort selection', () => {
  const outcome = stoppedAfterBaseline();
  if (!outcome.ok) throw Error(outcome.message);
  const base = outcome.routes[0];
  if (!base.score.rated) throw Error('Expected rated fixture');
  const a: RouxRoute = { ...base, id: 'a', basis: 'optimized' },
    b: RouxRoute = {
      ...a,
      id: 'b',
      score: { ...base.score, G: base.score.G + 1, cost: base.score.cost + 2 },
    };
  const evidence = {
    status: 'best-found' as const,
    lowerBound: 0,
    upperBound: base.counts.first,
    witness: base.trace.stages[1].actions.flatMap((a) => a.moves),
    completedDepth: -1,
  };
  const selected = selectRouxRoutes([a, b], { 'white-blue': evidence }, 4);
  expect(selected.map((r) => r.id)).toEqual(['a']);
});
it('finishes optional bridge candidates, keeps partial witnesses out of results and shares selected frames', () => {
  const frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!,
    held = e.apply(e.apply(e.solved(), frame.positioningMoves), ['D2', "F'", "R'", 'D']),
    input = prepareRouxInput(e, {
      kind: 'facelets',
      facelets: stateToFacelets(e.apply(held, invertTeachingMoves(frame.positioningMoves))),
    }),
    run = searchAdvancedRoux(
      e,
      input,
      {
        allowedFrames: ['white-blue', 'yellow-red'],
        mode: 'lab',
        modelVersion: 'roux-execution-v1',
      },
      assets,
      createRouxSearchBudget('lab', { now: () => 0, maxOperations: 500000 }),
    );
  let next = run.next(),
    results = 0;
  while (!next.done) {
    if (next.value.kind === 'result') {
      validateRouxRoute(e, next.value.route, assets);
      results++;
    }
    next = run.next();
  }
  expect(next.value.ok, JSON.stringify(next.value)).toBe(true);
  if (!next.value.ok) throw Error(next.value.message);
  expect(next.value.coverage.reason).not.toBe('error');
  expect(results).toBeGreaterThan(2);
  expect(Object.keys(next.value.coverage.frames)).toEqual(
    expect.arrayContaining(['white-blue', 'yellow-red']),
  );
  expect(next.value.routes.length).toBeLessThanOrEqual(4);
  for (const r of next.value.routes) expect(e.isSolved(r.trace.final)).toBe(true);
});
