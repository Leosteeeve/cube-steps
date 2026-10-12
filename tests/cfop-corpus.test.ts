import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine, CubeState, SolveTrace } from '../src/core/types';
import { stateToFacelets } from '../src/core/facelets';
import { solveCFOP } from '../src/methods/cfop/solve';
import { CFOP_RUNTIME } from '../src/methods/cfop/definition';
import { CFOP_STAGE_IDS } from '../src/methods/cfop/stages';
import { CFOP_ALGORITHMS } from '../src/methods/cfop/catalog';
import { observeF2LPairs } from '../src/methods/cfop/f2l-cases';
import { pieceSolved } from '../src/methods/shared/pieces';
import { verifyTrace } from '../src/methods/shared/verification';
import { flattenTrace } from '../src/methods/shared/trace';
import { handleSolveRequest } from '../src/workers/solve-request';
import { seededScramble } from './fixtures/lbl-cases';
import { replayMatchesRecordedStates } from './helpers/trace';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
function check(initial: CubeState, trace: SolveTrace) {
  expect(trace.method).toBe('cfop-beginner');
  expect(engine.equals(trace.initial, initial)).toBe(true);
  expect(trace.stages.map(s => s.id)).toEqual(CFOP_STAGE_IDS);
  expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
  expect(engine.isSolved(engine.apply(initial, flattenTrace(trace).moves))).toBe(true);
  verifyTrace(engine, trace, CFOP_RUNTIME);
  for (const stage of trace.stages) {
    if (stage.id.includes('oll') || stage.id.includes('pll')) expect(stage.actions.filter(a => a.kind === 'algorithm').length).toBeLessThanOrEqual(1);
    for (const a of stage.actions) {
      if (a.kind === 'algorithm') expect(a.moves).toEqual(CFOP_ALGORITHMS[a.algorithmId!].moves);
      if (a.pair) {
        const after = engine.observe(a.after);
        for (const pair of observeF2LPairs(engine, a.before).filter(p => p.solved)) for (const id of [pair.cornerId, pair.edgeId]) expect(pieceSolved([...after.edges, ...after.corners].find(p => p.id === id)!, after)).toBe(true);
      }
    }
  }
}
it('replays 1,000 deterministic CFOP scrambles twice and their color-input sessions', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const moves = seededScramble(seed), initial = engine.apply(engine.solved(), moves);
    try {
      const result = solveCFOP(engine, initial);
      if (!result.ok) throw new Error(`${result.stageId}: ${result.message}`);
      check(initial, result.trace);
      expect(solveCFOP(engine, initial)).toEqual(result);
      const facelets = stateToFacelets(initial);
      const reply = handleSolveRequest(engine, { requestId: seed, method: 'cfop-beginner', input: { kind: 'facelets', facelets } });
      if (!reply?.result.ok) throw new Error(JSON.stringify(reply));
      expect(reply.result.session.input).toEqual({ kind: 'facelets', facelets });
      check(initial, reply.result.session.trace);
    } catch (error) { throw new Error(`CFOP seed ${seed}; scramble: ${moves.join(' ')}; ${error instanceof Error ? error.message : error}`, { cause: error }); }
  }
}, 180000);
