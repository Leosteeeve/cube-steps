import type { CubeEngine, CubeState, SolveResult } from '../../core/types';
import { createMethodTrace, RuleError } from '../shared/trace';
import { verifyTrace } from '../shared/verification';
import { validateRouxAssets, type RouxAssets } from './assets';
import { createRouxRuntime } from './definition';
import { ROUX_STAGE_IDS } from './stages';
import { createRouxBudget, ROUX_LIMITS, RouxPlanningError, type RouxLimits } from './budget';
import { rouxHoldingAction } from './holding';
import { planFirstBlock } from './blocks/first-block';
import { planSecondBlock } from './blocks/second-block';
import { planCornerOrientation, planCornerPermutation } from './corners/plan';
import { planEdgeOrientation } from './lse/orientation';
import { planLeftRightEdges, planLastFourEdges } from './lse/placement';
import type { RouxStageId, RouxPlanResult } from './types';
const skips = [
  'The starting hold is already established.',
  'The white-blue block is already complete.',
  'Both side blocks are already complete.',
  'All yellow corner stickers already face up; no OCLL formula is needed.',
  'The corners are already solved in the block frame.',
  'All six edges are already oriented under a valid center reference.',
  'The yellow-blue and yellow-green edges already match their neighboring corners.',
  'The whole cube, centers and final alignment are already solved.',
];
export function solveRoux(
  engine: CubeEngine,
  initial: CubeState,
  raw: RouxAssets,
  limits: Partial<RouxLimits> = {},
  now?: () => number,
): SolveResult {
  let stageId: RouxStageId = 'roux-frame';
  try {
    const assets = validateRouxAssets(raw),
      budget = createRouxBudget(limits, now),
      runtime = createRouxRuntime(assets),
      trace = createMethodTrace(engine, initial, runtime, {
        maxActions: limits.maxActions ?? ROUX_LIMITS.maxActions,
        maxMoves: limits.maxMoves ?? ROUX_LIMITS.maxMoves,
      });
    const append = (a: Parameters<typeof trace.append>[0]) => {
      budget.action(stageId, a.moves);
      const before = trace.current;
      trace.append(a);
      const { check, ...draft } = a;
      if (
        !runtime.checkAction(
          engine,
          {
            ...draft,
            before,
            after: trace.current,
            checkpoint: {
              id: check?.id ?? 'roux-check',
              description: check?.description ?? '',
              passed: true,
            },
          },
          stageId,
        )
      )
        throw new RouxPlanningError(
          'verification',
          stageId,
          'The teaching action failed independent rule verification.',
        );
    };
    trace.beginStage(stageId);
    append(rouxHoldingAction(engine, trace.current));
    trace.endStage();
    const rules: ((state: CubeState) => RouxPlanResult)[] = [
      (s) => planFirstBlock(engine, s, assets.blockPolicies, budget),
      (s) => planSecondBlock(engine, s, assets.blockPolicies, budget),
      (s) => planCornerOrientation(engine, s, budget),
      (s) => planCornerPermutation(engine, s, budget),
      (s) => planEdgeOrientation(engine, s, assets.lse, budget),
      (s) => planLeftRightEdges(engine, s, assets.lse, budget),
      (s) => planLastFourEdges(engine, s, assets.lse, budget),
    ];
    for (let i = 0; i < rules.length; i++) {
      stageId = ROUX_STAGE_IDS[i + 1];
      trace.beginStage(stageId);
      const result = rules[i](trace.current);
      if (!result.ok) return result;
      for (const a of result.actions) append(a);
      if (!engine.equals(trace.current, result.state))
        throw Error('The planned state does not match physical replay.');
      trace.endStage(skips[i + 1]);
      budget.check(stageId);
    }
    const result = trace.finish();
    verifyTrace(engine, result, runtime);
    budget.check(stageId);
    return { ok: true, trace: result };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof RuleError || error instanceof RouxPlanningError
          ? error.code
          : 'verification',
      stageId,
      message: error instanceof Error ? error.message : 'Roux solving failed.',
    };
  }
}
