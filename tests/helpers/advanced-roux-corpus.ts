import assert from 'node:assert/strict';
import type { CubeEngine, SolveInput } from '../../src/core/types';
import type { AdvancedRouxAssets } from '../../src/methods/roux-advanced/assets';
import type { RouxFrameId } from '../../src/methods/roux-advanced/types';
import type { RouxRoute } from '../../src/roux-lab/types';
import { createRouxSearchBudget, meterRouxEngine } from '../../src/methods/roux-advanced/budget';
import { prepareRouxInput } from '../../src/methods/roux-advanced/input';
import { searchAdvancedRoux } from '../../src/methods/roux-advanced/search';
import { createAdvancedRouxRuntime } from '../../src/methods/roux-advanced/definition';
import { verifyTrace } from '../../src/methods/shared/verification';
import { ROUX_FRAMES } from '../../src/methods/roux-advanced/frames';
import { fingerprintLabState } from '../../src/lab/input';
import { combineAdjacentTurns } from '../../src/methods/shared/connected-actions';
import { seededScramble } from '../fixtures/lbl-cases';
import { rouxStageConnectionInfo } from '../../src/player/roux-stage-connections';

// Xorshift's all-zero state is absorbing. Preserve all other historical seeds.
export const advancedRouxScramble = (seed: number) => seededScramble(seed || 0x9e3779b9);
export function runAdvancedRouxFixture(
  e: CubeEngine,
  assets: AdvancedRouxAssets,
  source: SolveInput,
  frameId: RouxFrameId,
) {
  let published = false;
  const budget = createRouxSearchBudget('normal', {
    now: () => 0,
    maxOperations: 400000,
    cancelled: () => published,
  });
  const start = performance.now(),
    input = prepareRouxInput(meterRouxEngine(e, budget), source),
    run = searchAdvancedRoux(
      e,
      input,
      { allowedFrames: [frameId], mode: 'normal', modelVersion: 'roux-execution-v1' },
      assets,
      budget,
    );
  let firstOperations = 0;
  for (;;) {
    const next = run.next();
    if (next.done) {
      assert(next.value.ok, next.value.ok ? '' : next.value.message);
      assert.notEqual(next.value.coverage.reason, 'error');
      const route = next.value.routes[0];
      assertAdvancedRouxReplay(e, route, assets);
      return { route, outcome: next.value, ms: performance.now() - start, firstOperations };
    }
    if (next.value.kind === 'result' && !published) {
      firstOperations = budget.snapshot().operations;
      published = true;
    }
  }
}
export function assertAdvancedRouxReplay(
  e: CubeEngine,
  route: RouxRoute,
  assets: AdvancedRouxAssets,
) {
  const frame = ROUX_FRAMES.find((f) => f.id === route.frameId)!;
  assert(frame);
  verifyTrace(e, route.trace, createAdvancedRouxRuntime(assets, frame.id));
  assert(e.equals(e.apply(e.solved(), route.input.setupMoves!), route.trace.initial));
  assert(e.equals(route.trace.final, e.apply(e.solved(), frame.positioningMoves)));
  assert.equal(route.trace.stages.length, 6);
  assert.equal(route.counts.combined, route.counts.first + route.counts.second);
  const actions = route.trace.stages.flatMap((s) => s.actions);
  assert(actions.length <= 128);
  assert(actions.flatMap((a) => a.moves).length <= 512);
}
export function inspectRouxWaste(e: CubeEngine, route: RouxRoute) {
  const loops: string[] = [],
    boundaries: string[] = [];
  // Observe full physical state, not only a target-piece projection. Skip initial holding.
  let state = route.trace.stages[0].after,
    index = 0;
  const seen = new Map([[fingerprintLabState(state), 0]]);
  let previous: import('../../src/core/types').TeachingMove | undefined;
  for (const [stageIndex, stage] of route.trace.stages.entries()) {
    if (stageIndex === 0) continue;
    const connection = rouxStageConnectionInfo(route.trace, stageIndex),
      connectionIndex = index;
    for (const [actionIndex, action] of stage.actions.entries()) {
      if (previous && combineAdjacentTurns([previous, action.moves[0]]).length < 2)
        if (actionIndex !== 0 || !connection)
          boundaries.push(`${stage.id}:${index}:${previous} ${action.moves[0]}`);
      for (const move of action.moves) {
        state = e.apply(state, [move]);
        index++;
        const key = fingerprintLabState(state),
          old = seen.get(key);
        if (
          old !== undefined &&
          !(
            connection &&
            old < connectionIndex &&
            index > connectionIndex &&
            old >= connectionIndex - connection.leftTurns &&
            index <= connectionIndex + connection.rightTurns
          )
        )
          loops.push(`${stage.id}:${old}-${index}`);
        seen.set(key, index);
      }
      previous = action.moves.at(-1);
    }
  }
  return { loops, boundaries };
}
