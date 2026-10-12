import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { stateToFacelets } from '../src/core/facelets';
import type { CubeEngine, CubeState } from '../src/core/types';
import { handleSolveRequest } from '../src/workers/solve-request';
import { flattenTrace } from '../src/methods/lbl/trace';
import { LBL_STAGE_IDS, checkStage } from '../src/methods/lbl/stages';
import { LBL_ALGORITHMS, type AlgorithmId } from '../src/methods/lbl/catalog';
import { seededScramble } from './fixtures/lbl-cases';
import { replayMatchesRecordedStates } from './helpers/trace';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
function verify(initial: CubeState, seed: number) {
  const facelets = stateToFacelets(initial);
  const reply = handleSolveRequest(engine, {
    requestId: seed,
    method: 'lbl',
    input: { kind: 'facelets', facelets },
  });
  if (!reply?.result.ok) throw new Error(`Color seed ${seed}: ${JSON.stringify(reply)}`);
  const { trace, input } = reply.result.session;
  expect(input).toEqual({ kind: 'facelets', facelets });
  expect(engine.equals(trace.initial, initial)).toBe(true);
  expect(trace.stages.map((stage) => stage.id)).toEqual(LBL_STAGE_IDS);
  expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
  expect(engine.isSolved(engine.apply(initial, flattenTrace(trace).moves))).toBe(true);
  for (const stage of trace.stages) {
    expect(stage.checkpoint.passed && checkStage(engine, stage.after, stage.id)).toBe(true);
    if (stage.status === 'skipped') {
      expect(stage.actions).toHaveLength(0);
      expect(stage.skipReason).toBeTruthy();
    }
    for (const action of stage.actions) {
      expect(action.recognition && action.explanation && action.checkpoint.passed).toBeTruthy();
      if (action.kind === 'algorithm')
        expect(action.moves).toEqual(LBL_ALGORITHMS[action.algorithmId as AlgorithmId].moves);
      if (action.repetition) expect(action.repetition.index).toBeGreaterThan(0);
    }
  }
  if (input.kind === 'facelets') expect(Object.isFrozen(input.facelets.F)).toBe(true);
}
it('decodes and replays 1,000 fixed-seed color inputs through the worker handler', () => {
  for (let seed = 1; seed <= 1000; seed++)
    verify(engine.apply(engine.solved(), seededScramble(seed)), seed);
}, 60000);
it('preserves solved and partially completed stages through color input', () => {
  verify(engine.solved(), 0);
  verify(engine.apply(engine.solved(), ['U']), 1001);
  verify(engine.apply(engine.solved(), ['R', 'U', "R'", "U'"]), 1002);
});
