import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine, SolveTrace, CubeState } from '../src/core/types';
import { stateToFacelets } from '../src/core/facelets';
import { solveAdvancedCFOP } from '../src/methods/advanced/solve';
import { ADVANCED_STAGE_IDS } from '../src/methods/advanced/stages';
import { ALGORITHM_REGISTRY } from '../src/algorithms/registry';
import { flattenTrace } from '../src/methods/shared/trace';
import { handleSolveRequest } from '../src/workers/solve-request';
import { seededScramble } from './fixtures/lbl-cases';
import { replayMatchesRecordedStates } from './helpers/trace';
let engine: CubeEngine;
const assets = {
  crossTable: {
    version: 1 as const,
    goalIndex: 69760,
    distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
  },
};
beforeAll(async () => {
  engine = await createCubeEngine();
});
function check(initial: CubeState, trace: SolveTrace) {
  expect(trace.method).toBe('cfop-advanced');
  expect(engine.equals(trace.initial, initial)).toBe(true);
  expect(trace.stages.map((s) => s.id)).toEqual(ADVANCED_STAGE_IDS);
  expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
  expect(engine.isSolved(engine.apply(initial, flattenTrace(trace).moves))).toBe(true);
  for (const stage of trace.stages) {
    expect(stage.checkpoint.passed).toBe(true);
    if (stage.id === 'advanced-oll' || stage.id === 'advanced-pll')
      expect(stage.actions.filter((a) => a.kind === 'algorithm').length).toBeLessThanOrEqual(1);
    for (const action of stage.actions) {
      expect(action.checkpoint.passed).toBe(true);
      if (action.kind === 'algorithm')
        expect(action.moves).toEqual(
          (
            ALGORITHM_REGISTRY.variants[action.algorithmId!] ??
            ALGORITHM_REGISTRY.preparations[action.algorithmId!]
          ).moves,
        );
    }
  }
}
it('replays_1000_advanced_inputs_twice_and_as_colors', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const moves = seededScramble(seed),
      initial = engine.apply(engine.solved(), moves),
      copy = structuredClone(initial);
    try {
      const r = solveAdvancedCFOP(engine, initial, assets);
      if (!r.ok) throw new Error(r.stageId + ': ' + r.message);
      check(initial, r.trace);
      expect(solveAdvancedCFOP(engine, initial, assets)).toEqual(r);
      expect(initial).toEqual(copy);
      const input = { kind: 'facelets', facelets: stateToFacelets(initial) },
        saved = structuredClone(input);
      const reply = handleSolveRequest(
        engine,
        { requestId: seed, method: 'cfop-advanced', input },
        assets,
      );
      if (!reply?.result.ok) throw new Error(JSON.stringify(reply));
      expect(reply.result.session.input).toEqual(input);
      expect(input).toEqual(saved);
      check(initial, reply.result.session.trace);
    } catch (error) {
      throw new Error('Advanced seed ' + seed + '; ' + moves.join(' ') + '; ' + String(error), {
        cause: error,
      });
    }
  }
}, 600000);
