import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { loadTestAdvancedRouxAssets } from '../../../tests/helpers/roux-advanced-assets';
import type { AdvancedRouxAssets } from './assets';
import { createRouxSearchBudget } from './budget';
import { prepareRouxInput } from './input';
import { ROUX_FRAMES } from './frames';
import { planBaselineBlocks } from './blocks/baseline';
import { completeRouxCandidateSteps } from './complete';
import { validateRouxRouteSteps } from './validate';
import { scoreRouxExecution, scoreRouxExecutionSteps } from './execution/score';
import { freezeLabValue } from '../../lab/input';
import type { RouxSearchBudget } from './types';
import { searchAdvancedRoux } from './search';
let e: CubeEngine, assets: AdvancedRouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
});
function measured<T, E>(g: Generator<E, T>, b: RouxSearchBudget) {
  let maximum = 0,
    count = 0,
    before = 0,
    stack = '',
    maximumAt = '';
  const charge = b.charge;
  b.charge = (...args) => {
    charge(...args);
    if (!stack && b.snapshot().operations - before > 256)
      stack = new Error('Oversized work slice').stack!;
  };
  try {
    for (;;) {
      before = b.snapshot().operations;
      stack = '';
      const next = g.next(),
        delta = b.snapshot().operations - before;
      if (delta > maximum) {
        maximum = delta;
        maximumAt = stack;
      }
      count++;
      if (next.done) return { value: next.value, maximum, count, maximumAt };
    }
  } finally {
    b.charge = charge;
  }
}
it('slices execution profile validation and grip search without changing the score', () => {
  const frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!,
    segments = [
      {
        phase: 'blocks' as const,
        before: e.apply(e.solved(), frame.positioningMoves),
        moves: ['R', 'U', "R'", 'M', 'U2', "M'"] as const,
        targets: [],
      },
    ],
    b = createRouxSearchBudget('normal', { now: () => 0 });
  const result = measured(scoreRouxExecutionSteps(e, segments, frame, assets.execution, b), b);
  expect(result.maximum).toBeLessThanOrEqual(256);
  expect(result.count).toBeGreaterThan(10);
  expect(result.value).toEqual(
    scoreRouxExecution(
      e,
      segments,
      frame,
      assets.execution,
      createRouxSearchBudget('normal', { now: () => 0 }),
    ),
  );
});
it('slices cold complete-route planning and independent verification', () => {
  const fresh = {
      ...assets,
      cmll: freezeLabValue(structuredClone(assets.cmll)),
      execution: freezeLabValue(structuredClone(assets.execution)),
    },
    frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!,
    input = prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'U', 'F'] }),
    b = createRouxSearchBudget('normal', { now: () => 0 });
  const baseline = planBaselineBlocks(e, input, frame, assets.beginner, b);
  let next = baseline.next();
  while (!next.done) next = baseline.next();
  const complete = measured(completeRouxCandidateSteps(e, input, frame, next.value, fresh, b), b);
  expect(complete.maximum, complete.maximumAt).toBeLessThanOrEqual(256);
  expect(complete.count).toBeGreaterThan(10);
  const verifyBudget = createRouxSearchBudget('normal', { now: () => 0 }),
    verify = measured(
      validateRouxRouteSteps(e, structuredClone(complete.value), fresh, verifyBudget),
      verifyBudget,
    );
  expect(verify.maximum, verify.maximumAt).toBeLessThanOrEqual(256);
  expect(verify.count).toBeGreaterThan(10);
  expect(verify.value.id).toBe(complete.value.id);
});
it('keeps the actual baseline-to-result search path within the operation quantum', () => {
  let published = false;
  const b = createRouxSearchBudget('normal', { now: () => 0, cancelled: () => published }),
    input = prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'F', 'U', 'L', 'D2'] });
  function* run() {
    const g = searchAdvancedRoux(
      e,
      input,
      { allowedFrames: ['white-blue'], mode: 'normal', modelVersion: 'roux-execution-v1' },
      assets,
      b,
    );
    for (;;) {
      const n = g.next();
      if (n.done) return n.value;
      if (n.value.kind === 'result') published = true;
      yield n.value;
    }
  }
  const result = measured(run(), b);
  expect(result.value.ok, JSON.stringify(result.value)).toBe(true);
  expect(result.maximum, result.maximumAt).toBeLessThanOrEqual(256);
});
it('also slices optional proof and second-block exploration after a baseline exists', () => {
  const b = createRouxSearchBudget('normal', { now: () => 0, maxOperations: 120000 }),
    input = prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'F', 'U'] });
  const result = measured(
    searchAdvancedRoux(
      e,
      input,
      { allowedFrames: ['white-blue'], mode: 'normal', modelVersion: 'roux-execution-v1' },
      assets,
      b,
    ),
    b,
  );
  expect(result.value.ok, JSON.stringify(result.value)).toBe(true);
  expect(result.maximum, result.maximumAt).toBeLessThanOrEqual(256);
});
