import type { CubeEngine, SolveTrace, TraceAction } from '../../core/types';
import type { MethodRuntime } from '../contracts';
import { joinTeachingActionsSteps } from './connected-actions';
import { verifyTraceSteps } from './verification';
import { TEACHING_WORK, drainTeachingSteps, type TeachingWork } from './work';
const family = (move: string) => move.replace(/[2']/g, '');

export function* compactTeachingTraceSteps(
  engine: CubeEngine,
  trace: SolveTrace,
  runtime: MethodRuntime,
): Generator<TeachingWork, SolveTrace> {
  // Validate all original rules before a zero-effect sequence can disappear.
  yield* verifyTraceSteps(engine, trace, runtime);
  const stages: SolveTrace['stages'] = [];
  for (const stage of trace.stages) {
    // Cross distance evidence and the initial holding lesson stay atomic.
    if (stage.id === 'advanced-cross' || stage.id === 'roux-frame' || stage.id === 'ar-position') {
      stages.push(stage);
      continue;
    }
    const actions: TraceAction[] = [];
    for (const action of stage.actions) {
      actions.push(action);
      while (actions.length >= 2) {
        const right = actions.at(-1)!,
          left = actions.at(-2)!;
        if (
          !left.moves.length ||
          !right.moves.length ||
          family(left.moves.at(-1)!) !== family(right.moves[0])
        )
          break;
        const joined = yield* joinTeachingActionsSteps(engine, [
          ...(left.joined?.sources ?? [left]),
          ...(right.joined?.sources ?? [right]),
        ]);
        actions.splice(-2, 2);
        if (joined.moves.length) actions.push(joined);
      }
      yield TEACHING_WORK;
    }
    stages.push({
      ...stage,
      actions,
      ...(actions.length
        ? {}
        : {
            status: 'skipped' as const,
            skipReason:
              stage.skipReason ??
              'The separate setup turns cancel; this stage already meets its goal.',
          }),
    });
  }
  return { ...trace, stages };
}
export function compactTeachingTrace(
  engine: CubeEngine,
  trace: SolveTrace,
  runtime: MethodRuntime,
): SolveTrace {
  return drainTeachingSteps(compactTeachingTraceSteps(engine, trace, runtime));
}
