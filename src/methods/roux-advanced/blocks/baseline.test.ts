import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { loadTestRouxAssets } from '../../../../tests/helpers/roux';
import { assertAdvancedDrafts } from '../../../../tests/helpers/advanced-roux';
import { ROUX_FRAMES, selectRouxFrames } from '../frames';
import { createRouxSearchBudget } from '../budget';
import { prepareRouxInput } from '../input';
import { blockCompleteInFrame } from '../predicates';
import { createRouxBudget } from '../../roux/budget';
import { planSideBlock, planSideBlockSteps } from '../../roux/blocks/build-block';
import { createRouxFrameMap } from '../frames';
import { planBaselineBlocks } from './baseline';
import type { RouxAssets } from '../types';
let e: CubeEngine, assets: RouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestRouxAssets();
});
function drain<T>(g: Generator<{ kind: 'work' }, T>): T {
  let v = g.next();
  while (!v.done) v = g.next();
  return v.value;
}
it('builds both blocks with mapped IDs in all eight allowed frames using one outer budget', () => {
  const input = prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'U', "F'", 'D', 'L2', 'B'] });
  for (const frame of ROUX_FRAMES) {
    const budget = createRouxSearchBudget('normal', { now: () => 0 });
    const result = drain(planBaselineBlocks(e, input, frame, assets, budget));
    expect(result.first.frameId).toBe(frame.id);
    expect(blockCompleteInFrame(e, result.state, frame, 'left')).toBe(true);
    expect(blockCompleteInFrame(e, result.state, frame, 'right')).toBe(true);
    const held = e.apply(input.initial, frame.positioningMoves);
    expect(e.equals(assertAdvancedDrafts(e, held, result.actions, frame), result.state)).toBe(true);
    expect(budget.snapshot().operations).toBeGreaterThan(0);
    expect(budget.remaining().operations).toBeGreaterThan(0);
    if (frame.bottom === 'yellow')
      expect(JSON.stringify(result.actions)).not.toMatch(/yellow top/i);
  }
});
it('stops an interrupted seed without returning a partial candidate', () => {
  const input = prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'U', 'F'] });
  const budget = createRouxSearchBudget('normal', { now: () => 0, maxOperations: 30 });
  expect(() => drain(planBaselineBlocks(e, input, ROUX_FRAMES[0], assets, budget))).toThrow(
    /work-limit/,
  );
});
it('rejects an empty, duplicated or unknown allowed frame set', () => {
  expect(() => selectRouxFrames([])).toThrow(/at least one/i);
  expect(() => selectRouxFrames(['white-blue', 'white-blue'])).toThrow();
  expect(() => selectRouxFrames(['invalid'])).toThrow();
  expect(selectRouxFrames(['yellow-green', 'white-blue']).map((f) => f.id)).toEqual([
    'yellow-green',
    'white-blue',
  ]);
});
it('keeps the beginner synchronous wrapper identical to the cooperative traversal', () => {
  const frame = ROUX_FRAMES[0],
    map = createRouxFrameMap(e, frame.id);
  const state = map.toCanonical(e.apply(e.solved(), ['R', 'F', 'U', ...frame.positioningMoves]));
  const a = planSideBlock(e, state, 'left', assets.blockPolicies, createRouxBudget());
  const b = drain(planSideBlockSteps(e, state, 'left', assets.blockPolicies, createRouxBudget()));
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
});
