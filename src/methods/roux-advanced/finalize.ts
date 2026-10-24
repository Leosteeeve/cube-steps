import type { CubeEngine, SolveTrace, TraceAction } from '../../core/types';
import { invertTeachingMoves } from '../../core/teaching-moves';
import { fingerprintLabState, freezeLabValue } from '../../lab/input';
import { compactTeachingTraceSteps } from '../shared/compact-trace';
import { verifyTraceSteps } from '../shared/verification';
import { drainTeachingSteps, applyTeachingSteps, type TeachingWork } from '../shared/work';
import { flattenTrace } from '../shared/trace';
import type { RouxRoute } from '../../roux-lab/types';
import { createAdvancedRouxRuntime } from './definition';
import { scoreRouxExecutionSteps } from './execution/score';
import { meterRouxEngine } from './budget';
import type { AdvancedRouxAssets } from './assets';
import type { FirstBlockEvidence, RouxFrame, RouxInput, RouxSearchBudget } from './types';
export function rouxTraceMeasures(trace: SolveTrace): Pick<RouxRoute, 'counts' | 'boundaries'> {
  const flat = flattenTrace(trace),
    first = trace.stages[1].actions.flatMap((a) => a.moves),
    second = trace.stages[2].actions.flatMap((a) => a.moves);
  const stm = (moves: readonly string[]) => moves.filter((m) => !/^[xyz]/.test(m)).length;
  return {
    counts: {
      first: stm(first),
      second: stm(second),
      combined: stm(first) + stm(second),
      rotations: [...first, ...second].filter((m) => /^[xyz]/.test(m)).length,
    },
    boundaries: {
      firstStart: flat.stages[1].start,
      firstEnd: flat.stages[1].end,
      secondEnd: flat.stages[2].end,
      cmllEnd: flat.stages[3].end,
    },
  };
}
export function rouxBlockSegments(trace: SolveTrace, e: CubeEngine) {
  return trace.stages.slice(0, 3).flatMap((s) =>
    s.actions.flatMap((a) => {
      const phase = s.id === 'ar-position' ? ('position' as const) : ('blocks' as const);
      if (a.ruleId === 'ar-execution-hold') {
        const first = a.moves.slice(0, 1),
          inner = a.moves.slice(1, -1),
          last = a.moves.slice(-1),
          held = e.apply(a.before, first);
        return [
          { before: a.before, moves: first, targets: [], phase },
          { before: held, moves: inner, targets: a.targets, phase },
          { before: e.apply(held, inner), moves: last, targets: [], phase },
        ];
      }
      return [
        {
          before: a.before,
          moves: a.moves,
          targets: a.targets,
          phase,
          ...(a.algorithmId ? { algorithmId: a.algorithmId } : {}),
        },
      ];
    }),
  );
}
export function originalRouxActions(trace: SolveTrace): TraceAction[] {
  return trace.stages.flatMap((s) => s.actions.flatMap((a) => a.joined?.sources ?? [a]));
}
export function rouxTraceMetadata(
  route: Pick<RouxRoute, 'frameId' | 'basis' | 'evidence' | 'counts' | 'lseMode'>,
): NonNullable<SolveTrace['rouxAdvanced']> {
  return {
    frameId: route.frameId,
    basis: route.basis,
    evidence: route.evidence,
    counts: route.counts,
    lseMode: route.lseMode,
    modelVersion: 'roux-execution-v1',
  };
}
export function rouxRouteId(
  route: Pick<RouxRoute, 'input' | 'frameId' | 'trace' | 'lseMode'>,
): string {
  const text = [
    route.input.fingerprint,
    route.frameId,
    route.lseMode,
    ...flattenTrace(route.trace).moves,
  ].join('|');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `roux-v1:${route.frameId}:${(hash >>> 0).toString(16)}`;
}
export function* finalizeRouxRouteSteps(
  raw: CubeEngine,
  input: RouxInput,
  frame: RouxFrame,
  source: SolveTrace,
  assets: AdvancedRouxAssets,
  budget: RouxSearchBudget,
  lseMode: RouxRoute['lseMode'],
  evidence: FirstBlockEvidence,
  basis: RouxRoute['basis'] = 'optimized',
  archivedFormulas: RouxRoute['formulas'] = {},
): Generator<TeachingWork, RouxRoute> {
  const e = meterRouxEngine(raw, budget),
    runtime = createAdvancedRouxRuntime(assets, frame.id, archivedFormulas),
    trace = yield* compactTeachingTraceSteps(e, source, runtime);
  yield* verifyTraceSteps(e, trace, runtime);
  const measures = rouxTraceMeasures(trace),
    moves = flattenTrace(trace).moves;
  if (moves.length > 512 || originalRouxActions(trace).length > 128)
    throw Error('Advanced Roux route exceeds 512 moves or 128 teaching actions.');
  const setupMoves =
    input.setupMoves && input.setupMoves.length <= 520
      ? input.setupMoves
      : [...frame.positioningMoves, ...invertTeachingMoves(moves)];
  if (
    setupMoves.length > 520 ||
    !e.equals(yield* applyTeachingSteps(e, e.solved(), setupMoves), input.initial) ||
    input.fingerprint !== fingerprintLabState(input.initial)
  )
    throw Error('Roux setup witness does not reproduce its input.');
  const score = yield* scoreRouxExecutionSteps(
    e,
    rouxBlockSegments(trace, e),
    frame,
    assets.execution,
    budget,
  );
  const formulas: RouxRoute['formulas'] = Object.fromEntries(
    originalRouxActions(trace)
      .filter((a) => a.algorithmId)
      .map((a) => [a.algorithmId!, runtime.presentation.algorithms[a.algorithmId!]]),
  );
  const route: RouxRoute = {
    kind: 'roux-lab',
    schemaVersion: 1,
    id: '',
    input: { ...input, setupMoves: [...setupMoves] },
    frameId: frame.id,
    trace,
    basis,
    evidence,
    score,
    ...measures,
    lseMode,
    formulas,
    versions: {
      app: 'cubesteps-roux-preview-v1',
      search: 'roux-search-v1',
      catalog: assets.cmll.digest,
      model: assets.execution.version,
    },
  };
  trace.rouxAdvanced = rouxTraceMetadata(route);
  route.id = rouxRouteId(route);
  return freezeLabValue(route);
}
export function finalizeRouxRoute(...args: Parameters<typeof finalizeRouxRouteSteps>): RouxRoute {
  return drainTeachingSteps(finalizeRouxRouteSteps(...args));
}
