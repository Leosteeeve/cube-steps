import type { CubeEngine, SolveTrace, TraceAction } from '../../core/types';
import type { MethodRuntime } from '../contracts';
import { joinTeachingActions } from './connected-actions';
import { verifyTrace } from './verification';
const family = (move: string) => move.replace(/[2']/g, '');

export function compactTeachingTrace(
  engine: CubeEngine,
  trace: SolveTrace,
  runtime: MethodRuntime,
): SolveTrace {
  // Validate all original rules before a zero-effect sequence can disappear.
  verifyTrace(engine, trace, runtime);
  return {
    ...trace,
    stages: trace.stages.map((stage) => {
      // Cross distance evidence and the initial holding lesson stay atomic.
      if (stage.id === 'advanced-cross' || stage.id === 'roux-frame') return stage;
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
          const joined = joinTeachingActions(engine, [
            ...(left.joined?.sources ?? [left]),
            ...(right.joined?.sources ?? [right]),
          ]);
          actions.splice(-2, 2);
          if (joined.moves.length) actions.push(joined);
        }
      }
      return {
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
      };
    }),
  };
}
