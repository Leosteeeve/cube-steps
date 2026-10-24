import type { CubeEngine, SolveTrace, TraceAction } from '../../core/types';
import type { RouxRoute } from '../../roux-lab/types';
import { createMethodTrace, type ActionInput } from '../shared/trace';
import { createAdvancedRouxRuntime, rouxPositionAction } from './definition';
import { finalizeRouxRoute, finalizeRouxRouteSteps, rouxBlockSegments } from './finalize';
import { planCmllVariantsSteps } from './cmll/plan';
import { planAdvancedLse, planAdvancedLseSteps, type AdvancedLsePlan } from './lse/plan';
import {
  TEACHING_WORK,
  drainTeachingSteps,
  applyTeachingSteps,
  type TeachingWork,
} from '../shared/work';
import { firstBlockLowerBound } from './blocks/distance';
import { compactBlockMovesSteps, explainBlockRouteSteps } from './blocks/explain';
import { describeBlockCandidateSteps } from './blocks/candidates';
import { blockCompleteInFrame } from './predicates';
import { improveBlockExecutionSteps, scoreRouxExecutionSteps } from './execution/score';
import { ROUX_FRAMES } from './frames';
import { meterRouxEngine, RouxBudgetStop } from './budget';
import { validateRouxRoute } from './validate';
import type { AdvancedRouxAssets } from './assets';
import type {
  FirstBlockEvidence,
  RouxFrame,
  RouxInput,
  RouxSearchBudget,
  TwoBlockCandidate,
} from './types';
function appendLse(builder: ReturnType<typeof createMethodTrace>, lse: AdvancedLsePlan): void {
  builder.beginStage('ar-eolr');
  let boundary = 0;
  for (const a of lse.actions) {
    if (boundary >= lse.eolrBoundary) break;
    builder.append(a);
    boundary += a.moves.length;
  }
  if (boundary !== lse.eolrBoundary)
    throw Error('LSE teaching boundary is not an action endpoint.');
  builder.endStage();
  builder.beginStage('ar-last-four');
  boundary = 0;
  for (const a of lse.actions) {
    if (boundary >= lse.eolrBoundary) builder.append(a);
    boundary += a.moves.length;
  }
  builder.endStage();
}
export function* completeRouxCandidateSteps(
  raw: CubeEngine,
  input: RouxInput,
  frame: RouxFrame,
  blocks: TwoBlockCandidate,
  assets: AdvancedRouxAssets,
  budget: RouxSearchBudget,
): Generator<TeachingWork, RouxRoute> {
  const e = meterRouxEngine(raw, budget),
    runtime = createAdvancedRouxRuntime(assets, frame.id),
    held = e.apply(input.initial, frame.positioningMoves);
  if (
    blocks.first.frameId !== frame.id ||
    !e.equals(yield* applyTeachingSteps(e, held, blocks.first.moves), blocks.first.state) ||
    !e.equals(yield* applyTeachingSteps(e, blocks.first.state, blocks.secondMoves), blocks.state)
  )
    throw Error('Disconnected two-block candidate.');
  const allMoves = [...blocks.first.moves, ...blocks.secondMoves];
  if (blocks.actions.flatMap((a) => a.moves).join(' ') !== allMoves.join(' '))
    throw Error('Block source actions do not match their candidate.');
  let cursor = held,
    boundary = 0;
  for (const draft of blocks.actions) {
    const after = yield* applyTeachingSteps(e, cursor, draft.moves);
    const stage = boundary < blocks.first.moves.length ? 'ar-first-block' : 'ar-second-block';
    const { check, ...action } = draft;
    if (
      (check && !check.test(after)) ||
      !(yield* runtime.checkActionSteps!(
        e,
        {
          ...action,
          before: cursor,
          after,
          checkpoint: { id: 'candidate', description: 'Candidate endpoint', passed: true },
        },
        stage,
      ))
    )
      throw Error('Block candidate source failed verification.');
    cursor = after;
    boundary += draft.moves.length;
    yield TEACHING_WORK;
  }
  const compact = yield* compactBlockMovesSteps(e, held, allMoves);
  if (compact.join(' ') !== allMoves.join(' ')) {
    // A cancelled cross-stage turn can erase the original FB checkpoint. Find
    // the first real complete block on the compact replay instead of inventing it.
    let state = held,
      split = 0;
    while (!blockCompleteInFrame(e, state, frame, 'left') && split < compact.length) {
      state = e.apply(state, [compact[split++]]);
      yield TEACHING_WORK;
    }
    const first = yield* describeBlockCandidateSteps(e, held, frame, compact.slice(0, split));
    const secondMoves = compact.slice(split);
    blocks = {
      ...blocks,
      first,
      secondMoves,
      secondTurns: secondMoves.length,
      actions: yield* explainBlockRouteSteps(e, input, frame, first.moves, secondMoves),
    };
  }
  const lowerBound = firstBlockLowerBound(e, held, frame, assets.blocks),
    evidence: FirstBlockEvidence =
      lowerBound === blocks.first.moves.length
        ? {
            status: 'proven-minimum',
            minimum: lowerBound,
            witness: [...blocks.first.moves],
            proof: {
              coordinateVersion: 1,
              moveSetVersion: 'roux-stm-v1',
              completedDepth: lowerBound - 1,
              assetDigest: assets.blocks.digest,
            },
          }
        : {
            status: 'best-found',
            lowerBound,
            upperBound: blocks.first.moves.length,
            witness: [...blocks.first.moves],
            completedDepth: lowerBound - 1,
          };
  let best: RouxRoute | undefined,
    bestTail = Infinity;
  try {
    yield TEACHING_WORK;
    const choices = yield* planCmllVariantsSteps(e, blocks.state, frame, assets.cmll, budget);
    for (const cmll of choices) {
      const lse = yield* planAdvancedLseSteps(
        e,
        cmll.state,
        frame,
        assets.lse,
        assets.execution,
        budget,
        'combined',
      );
      const builder = createMethodTrace(e, input.initial, runtime, {
        maxActions: 128,
        maxMoves: 512,
      });
      builder.beginStage('ar-position');
      const position = rouxPositionAction(e, input.initial, frame);
      if (position) builder.append(position);
      builder.endStage();
      builder.beginStage('ar-first-block');
      let n = 0;
      for (const action of blocks.actions) {
        if (n === blocks.first.moves.length) break;
        builder.append(action);
        n += action.moves.length;
        yield TEACHING_WORK;
      }
      if (n !== blocks.first.moves.length || !e.equals(builder.current, blocks.first.state))
        throw Error('First-block action boundary mismatch.');
      builder.endStage();
      builder.beginStage('ar-second-block');
      n = 0;
      for (const action of blocks.actions) {
        if (n >= blocks.first.moves.length) builder.append(action);
        n += action.moves.length;
        yield TEACHING_WORK;
      }
      if (!e.equals(builder.current, blocks.state))
        throw Error('Second-block action endpoint mismatch.');
      builder.endStage();
      builder.beginStage('ar-cmll');
      for (const action of cmll.actions) {
        builder.append(action);
        yield TEACHING_WORK;
      }
      builder.endStage();
      appendLse(builder, lse);
      yield TEACHING_WORK;
      const route = yield* finalizeRouxRouteSteps(
        e,
        input,
        frame,
        builder.finish(),
        assets,
        budget,
        'combined',
        evidence,
      );
      if (!best) best = route;
      const tailScore = yield* scoreRouxExecutionSteps(
        e,
        route.trace.stages.slice(3).flatMap((s) =>
          s.actions.map((a) => ({
            before: a.before,
            moves: a.moves,
            targets: a.targets,
            phase: 'blocks' as const,
          })),
        ),
        frame,
        assets.execution,
        budget,
      );
      const tail = tailScore.rated ? tailScore.cost : Infinity;
      if (!best || tail < bestTail) {
        best = route;
        bestTail = tail;
      }
    }
  } catch (error) {
    if (!(error instanceof RouxBudgetStop) || !best) throw error;
  }
  if (!best) throw Error('No verified CMLL and LSE continuation.');
  try {
    const actions = best.trace.stages.slice(0, 3).flatMap((s) => s.actions),
      segments = rouxBlockSegments(best.trace, e);
    const improved = yield* improveBlockExecutionSteps(
      e,
      segments,
      frame,
      assets.execution,
      budget,
      (_s, i) => actions[i]?.kind === 'setup',
    );
    if (
      improved.segments !== segments &&
      improved.score.rated &&
      best.score.rated &&
      improved.score.cost < best.score.cost
    ) {
      const index = segments.findIndex((s, i) => s !== improved.segments[i]),
        original = actions[index],
        moves = improved.segments.slice(index, index + 3).flatMap((s) => s.moves);
      const changed: TraceAction = {
        ...original,
        ruleId: 'ar-execution-hold',
        moves,
        explanation: `Physically turn ${moves[0]} to bring the target pieces into the shown working view. Follow ${moves.slice(1, -1).join(' ')}, then turn ${moves.at(-1)} to restore the selected hold. This is an actual hold change, not a camera movement. Check the block at the end.`,
        rouxAdvanced: { ...original.rouxAdvanced!, protection: 'endpoint' },
      };
      const trace: SolveTrace = {
        ...best.trace,
        stages: best.trace.stages.map((s) => ({
          ...s,
          actions: s.actions.map((a) => (a === original ? changed : a)),
        })),
      };
      const candidate = yield* finalizeRouxRouteSteps(
        e,
        input,
        frame,
        trace,
        assets,
        budget,
        'combined',
        evidence,
      );
      if (candidate.score.rated && candidate.score.cost < best.score.cost) best = candidate;
    }
  } catch (error) {
    if (!(error instanceof RouxBudgetStop)) throw error;
  }
  return best;
}
export function completeRouxCandidate(
  ...args: Parameters<typeof completeRouxCandidateSteps>
): RouxRoute {
  return drainTeachingSteps(completeRouxCandidateSteps(...args));
}
export function withBasicLse(
  raw: CubeEngine,
  route: RouxRoute,
  assets: AdvancedRouxAssets,
  budget: RouxSearchBudget,
): RouxRoute {
  route = validateRouxRoute(raw, route, assets, budget);
  const e = meterRouxEngine(raw, budget),
    frame = ROUX_FRAMES.find((f) => f.id === route.frameId)!;
  if (!frame) throw Error('Unknown Roux frame.');
  const lse = planAdvancedLse(
      e,
      route.trace.stages[3].after,
      frame,
      assets.lse,
      assets.execution,
      budget,
      'basic',
    ),
    builder = createMethodTrace(
      e,
      route.trace.initial,
      createAdvancedRouxRuntime(assets, frame.id, route.formulas),
    );
  for (const stage of route.trace.stages.slice(0, 4)) {
    builder.beginStage(stage.id);
    // Rebuild the exact source prefix; the finalizer deterministically compacts it again.
    for (const a of stage.actions.flatMap((a) => a.joined?.sources ?? [a]))
      builder.append(actionDraft(a));
    builder.endStage(stage.skipReason);
  }
  appendLse(builder, lse);
  return finalizeRouxRoute(
    e,
    route.input,
    frame,
    builder.finish(),
    assets,
    budget,
    'basic',
    route.evidence,
    route.basis,
    route.formulas,
  );
}
export function actionDraft(action: TraceAction): ActionInput {
  const { before: _before, after: _after, checkpoint: _checkpoint, ...draft } = action;
  return draft;
}
