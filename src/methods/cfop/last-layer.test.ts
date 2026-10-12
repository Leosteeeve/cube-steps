import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, CFOPStageId, TeachingMove } from '../../core/types';
import { invertTeachingMoves } from '../../core/teaching-moves';
import { createMethodTrace } from '../shared/trace';
import { CFOP_RUNTIME } from './definition';
import { CFOP_ALGORITHMS, LAST_LAYER_CASES } from './catalog';
import { solveOLLEdges, solveOLLCorners, solvePLLCorners, solvePLLEdges, solveAUF } from './last-layer';
import { orientationFixtures, permutationFixtures } from '../../../tests/fixtures/cfop-cases';
import { stateToFacelets, validateFacelets } from '../../core/facelets';
import { checkCFOPStage } from './stages';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
const rules = { 'cfop-oll-edges': solveOLLEdges, 'cfop-oll-corners': solveOLLCorners, 'cfop-pll-corners': solvePLLCorners, 'cfop-pll-edges': solvePLLEdges, 'cfop-auf': solveAUF };
it('uses one recognized formula for each unsolved look', () => {
  for (const entry of LAST_LAYER_CASES) for (const u of [[], ['U'], ['U2'], ["U'"]] as TeachingMove[][]) for (const y of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
    const initial = engine.apply(engine.solved(), ['x2', ...invertTeachingMoves(CFOP_ALGORITHMS[entry.id].moves), ...u, ...y]);
    const trace = createMethodTrace(engine, initial, CFOP_RUNTIME);
    trace.beginStage(entry.stage);
    rules[entry.stage as keyof typeof rules]({ engine, trace }); trace.endStage();
    const stage = trace.finish().stages[0];
    expect(stage.actions.filter(a => a.kind === 'algorithm')).toHaveLength(1);
    expect(stage.actions.find(a => a.kind === 'algorithm')!.algorithmId).toBe(entry.id);
    expect(checkCFOPStage(engine, stage.after, entry.stage)).toBe(true);
    for (const a of stage.actions) expect(CFOP_RUNTIME.checkAction(engine, a, stage.id), entry.id).toBe(true);
  }
});
it('solves independent legal last layers and skips already satisfied looks', () => {
  for (const initial of [...orientationFixtures(engine), ...permutationFixtures(engine)]) {
    expect(validateFacelets(stateToFacelets(initial), engine.solved()).ok).toBe(true);
    const trace = createMethodTrace(engine, initial, CFOP_RUNTIME);
    for (const [stage, rule] of Object.entries(rules)) {
      const skipped = checkCFOPStage(engine, trace.current, stage as CFOPStageId);
      trace.beginStage(stage as CFOPStageId); rule({ engine, trace }); trace.endStage();
      const result = trace.finish().stages.at(-1)!;
      if (skipped) expect(result.actions).toHaveLength(0);
      for (const a of result.actions) expect(CFOP_RUNTIME.checkAction(engine, a, result.id)).toBe(true);
    }
    expect(engine.isSolved(trace.current)).toBe(true);
  }
});
it('records AUF alone without a permutation formula', () => {
  const trace = createMethodTrace(engine, engine.apply(engine.solved(), ['D']), CFOP_RUNTIME);
  trace.beginStage('cfop-auf'); solveAUF({ engine, trace }); trace.endStage();
  expect(trace.finish().stages[0].actions.map(a => a.kind)).toEqual(['regrip', 'setup']);
  expect(engine.isSolved(trace.current)).toBe(true);
});
it('allows temporary M-center motion and restores centers at the formula boundary', () => {
  for (const id of ['pll-h', 'pll-z']) {
    const moves = CFOP_ALGORITHMS[id].moves, initial = engine.apply(engine.solved(), ['x2', ...invertTeachingMoves(moves)]);
    let current = initial, moved = false;
    const centers = [];
    for (let i = 0; i < moves.length; i++) {
      current = engine.apply(current, [moves[i]]);
      expect(engine.equals(current, engine.apply(initial, moves.slice(0, i + 1)))).toBe(true);
      centers.push(engine.observe(current).centers);
      if (engine.observe(current).centers.D !== 'white') moved = true;
    }
    expect(moved).toBe(true);
    expect(engine.observe(current).centers).toEqual(engine.observe(initial).centers);
    expect(centers).toMatchSnapshot(id);
  }
});
