import type { CubeEngine, CubeState, SolveLimits, SolveResult } from '../../core/types';
import { createMethodTrace, RuleError } from '../shared/trace';
import { verifyTrace } from '../shared/verification';
import { CFOP_RUNTIME } from './definition';
import { CFOP_STAGE_IDS } from './stages';
import { solveCFOPCross } from './cross';
import { solveCFOPF2L } from './f2l';
import { solveOLLEdges, solveOLLCorners, solvePLLCorners, solvePLLEdges, solveAUF } from './last-layer';
export function solveCFOP(engine: CubeEngine, initial: CubeState, limits?: SolveLimits): SolveResult {
  const trace = createMethodTrace(engine, initial, CFOP_RUNTIME, limits);
  const rules = [solveCFOPCross, solveCFOPF2L, solveOLLEdges, solveOLLCorners, solvePLLCorners, solvePLLEdges, solveAUF];
  try {
    for (let i = 0; i < rules.length; i++) {
      trace.beginStage(CFOP_STAGE_IDS[i]);
      const result = rules[i]({ engine, trace });
      if (!result.ok) return result;
      trace.endStage();
    }
    const result = trace.finish();
    verifyTrace(engine, result, CFOP_RUNTIME);
    return { ok: true, trace: result };
  } catch (error) {
    return { ok: false, code: error instanceof RuleError ? error.code : 'verification', stageId: trace.stageId, message: error instanceof Error ? error.message : 'Unexpected CFOP teaching rule failure.' };
  }
}
