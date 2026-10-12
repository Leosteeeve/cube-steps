import { verifyTrace } from '../shared/verification';
import { LBL_RUNTIME } from './definition';
import type { CubeEngine, CubeState, SolveLimits, SolveResult } from '../../core/types';
import { createTraceBuilder, RuleError } from './trace';
import { LBL_STAGE_IDS } from './stages';
import { solveWhiteCross } from './cross';
import { solveFirstLayer } from './first-layer';
import { solveMiddleLayer } from './middle-layer';
import {
  solveCornerOrientation,
  solveTopCorners,
  solveTopCross,
  solveTopEdges,
} from './last-layer';
export function solveLBL(
  engine: CubeEngine,
  initial: CubeState,
  options?: SolveLimits,
): SolveResult {
  const trace = createTraceBuilder(engine, initial, options);
  const rules = [
    solveWhiteCross,
    solveFirstLayer,
    solveMiddleLayer,
    solveTopCross,
    solveTopEdges,
    solveTopCorners,
    solveCornerOrientation,
  ];
  try {
    for (let i = 0; i < LBL_STAGE_IDS.length; i++) {
      const id = LBL_STAGE_IDS[i];
      trace.beginStage(id);
      const result = rules[i]({ engine, trace });
      if (!result.ok) return result;
      trace.endStage();
    }
    const result = trace.finish();
    verifyTrace(engine, result, LBL_RUNTIME);
    return { ok: true, trace: result };
  } catch (error) {
    if (error instanceof RuleError)
      return { ok: false, code: error.code, stageId: error.stageId, message: error.message };
    return {
      ok: false,
      code: 'verification',
      stageId: trace.stageId,
      message: error instanceof Error ? error.message : 'Unexpected teaching rule failure.',
    };
  }
}
