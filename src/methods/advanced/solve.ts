import type { CubeEngine, CubeState, SolveLimits, SolveResult } from '../../core/types';
import type { AdvancedAssets } from './assets';
import { createMethodTrace, RuleError } from '../shared/trace';
import { verifyTrace } from '../shared/verification';
import { compactTeachingTrace } from '../shared/compact-trace';
import { createAdvancedRuntime } from './definition';
import { ADVANCED_STAGE_IDS, checkAdvancedStage } from './stages';
import { planShortestCross, crossMoveEvidence } from './cross/solve';
import { solveAdvancedF2L } from './f2l/solve';
import { solveAdvancedOLL, solveAdvancedPLL, solveAdvancedAUF } from './last-layer';
import { ensureAdvancedHolding, type AdvancedContext } from './context';
function solveAdvancedCross(context: AdvancedContext) {
  const { engine, trace, crossTable } = context;
  if (checkAdvancedStage(engine, trace.current, 'advanced-cross'))
    return { ok: true as const, state: trace.current };
  ensureAdvancedHolding(context);
  const plan = planShortestCross(engine, trace.current, crossTable);
  for (let i = 0; i < plan.moves.length; i++) {
    const move = plan.moves[i],
      after = engine.apply(trace.current, [move]),
      evidence = crossMoveEvidence(engine, trace.current, after);
    trace.append({
      kind: 'setup',
      ruleId: 'advanced-cross-step',
      caseId: 'shortest-cross',
      moves: [move],
      ...evidence,
      cross: { distanceBefore: plan.distances[i], distanceAfter: plan.distances[i + 1] },
    });
  }
  return { ok: true as const, state: trace.current };
}
export function solveAdvancedCFOP(
  engine: CubeEngine,
  initial: CubeState,
  assets: AdvancedAssets,
  limits?: SolveLimits,
): SolveResult {
  const runtime = createAdvancedRuntime(assets.crossTable),
    trace = createMethodTrace(engine, initial, runtime, limits),
    context = { engine, trace, crossTable: assets.crossTable };
  const rules = [
    solveAdvancedCross,
    solveAdvancedF2L,
    solveAdvancedOLL,
    solveAdvancedPLL,
    solveAdvancedAUF,
  ];
  try {
    for (let i = 0; i < rules.length; i++) {
      trace.beginStage(ADVANCED_STAGE_IDS[i]);
      const r = rules[i](context);
      if (!r.ok) return r;
      trace.endStage();
    }
    const result = compactTeachingTrace(engine, trace.finish(), runtime);
    verifyTrace(engine, result, runtime);
    return { ok: true, trace: result };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof RuleError ? error.code : 'verification',
      stageId: trace.stageId,
      message: error instanceof Error ? error.message : 'Unexpected Advanced CFOP rule failure.',
    };
  }
}
