import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine } from '../src/core/types';
import { solveLBL } from '../src/methods/lbl/solve';
import { flattenTrace } from '../src/methods/lbl/trace';
import { LBL_STAGE_IDS, checkStage } from '../src/methods/lbl/stages';
import { LBL_ALGORITHMS, type AlgorithmId } from '../src/methods/lbl/catalog';
import { seededScramble } from './fixtures/lbl-cases';
import { replayMatchesRecordedStates } from './helpers/trace';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('replays 1,000 seeded scrambles with complete deterministic teaching evidence', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const initial = engine.apply(engine.solved(), seededScramble(seed));
    const result = solveLBL(engine, initial);
    if (!result.ok) throw new Error(`Seed ${seed}: ${result.stageId}: ${result.message}`);
    expect(result.trace.stages.map((s) => s.id)).toEqual(LBL_STAGE_IDS);
    expect(engine.isSolved(engine.apply(initial, flattenTrace(result.trace).moves))).toBe(true);
    expect(replayMatchesRecordedStates(engine, result.trace)).toBe(true);
    for (const stage of result.trace.stages) {
      expect(checkStage(engine, stage.after, stage.id)).toBe(true);
      for (const action of stage.actions) {
        expect(
          action.recognition.length > 0 &&
            action.explanation.length > 0 &&
            action.checkpoint.passed,
        ).toBe(true);
        if (action.kind === 'algorithm')
          expect(action.moves).toEqual(LBL_ALGORITHMS[action.algorithmId as AlgorithmId].moves);
      }
    }
    expect(solveLBL(engine, initial)).toEqual(result);
  }
}, 60000);
