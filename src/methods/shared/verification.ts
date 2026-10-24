import type { CubeEngine, SolveTrace, StageId, TraceAction } from '../../core/types';
import { joinTeachingActionsSteps } from './connected-actions';
import { TEACHING_WORK, drainTeachingSteps, applyTeachingSteps, type TeachingWork } from './work';
import { isTeachingMove } from '../../core/teaching-moves';
import type { MethodRuntime } from '../contracts';
import { RuleError } from './trace';
export function* verifyTraceSteps(
  engine: CubeEngine,
  trace: SolveTrace,
  runtime: MethodRuntime,
): Generator<TeachingWork, void> {
  const expected = runtime.presentation.stages;
  let stageId: StageId = expected[0].id;
  const require = (ok: boolean, message: string) => {
    if (!ok) throw new RuleError('verification', stageId, message);
  };
  require(trace.method === runtime.presentation.id, 'The solution method does not match.');
  require(trace.stages.length === expected.length, 'The trace must contain every method stage.');
  let state = trace.initial;
  for (let i = 0; i < expected.length; i++) {
    const stage = trace.stages[i];
    stageId = expected[i].id;
    require(stage.id === stageId, 'Stage order does not match the selected method.');
    require(engine.equals(state, stage.before), 'Stage starting state mismatch.');
    require(stage.status ===
      (stage.actions.length ? 'completed' : 'skipped'), 'Stage status does not match its actions.');
    require(stage.status !== 'skipped' ||
      Boolean(stage.skipReason), 'A skipped stage needs an explanation.');
    const verifyAction = function* (
      action: TraceAction,
      allowJoined = true,
    ): Generator<TeachingWork, void> {
      yield TEACHING_WORK;
      require(action.moves.length > 0 &&
        action.moves.every(isTeachingMove), 'Invalid teaching moves.');
      require(Boolean(
        action.recognition && action.explanation && action.ruleId && action.caseId,
      ), 'Missing teaching explanation.');
      require(action.kind !== 'regrip' ||
        action.moves.every((m) => /^[xyz]/.test(m)), 'A regrip must rotate the whole cube.');
      if (action.kind === 'joined') {
        require(allowJoined &&
          !!action.joined &&
          Array.isArray(action.joined.sources) &&
          action.joined.sources.length >= 2 &&
          action.joined.sources.length <= 512, 'Invalid connected teaching references.');
        for (const source of action.joined!.sources) yield* verifyAction(source, false);
        const expected = yield* joinTeachingActionsSteps(engine, action.joined!.sources);
        for (const key of [
          'kind',
          'ruleId',
          'caseId',
          'targets',
          'recognition',
          'explanation',
          'moves',
          'checkpoint',
          'pair',
          'roux',
          'rouxAdvanced',
          'algorithmId',
          'selection',
          'cross',
          'repetition',
        ] as const)
          require(JSON.stringify(action[key]) ===
            JSON.stringify(expected[key]), 'Connected teaching metadata mismatch.');
        require(action.joined!.savedMoves === expected.joined!.savedMoves &&
          engine.equals(action.before, expected.before) &&
          engine.equals(action.after, expected.after), 'Connected teaching endpoint mismatch.');
        return;
      }
      require(action.joined === undefined, 'Only connected actions may contain references.');
      if (action.kind === 'algorithm') {
        const algorithm = runtime.presentation.algorithms[action.algorithmId ?? ''];
        require(Boolean(algorithm) &&
          algorithm.moves.join(' ') ===
            action.moves.join(' '), 'Algorithm does not match its method catalog.');
      } else
        require(action.algorithmId ===
          undefined, 'Only algorithm actions may reference a formula.');
      require(engine.equals(
        yield* applyTeachingSteps(engine, action.before, action.moves),
        action.after,
      ), 'Action endpoint mismatch.');
      const checked = runtime.checkActionSteps
        ? yield* runtime.checkActionSteps(engine, action, stageId)
        : runtime.checkAction(engine, action, stageId);
      require(action.checkpoint.passed &&
        checked, 'Action precondition or effect failed verification.');
    };
    for (const action of stage.actions) {
      require(engine.equals(state, action.before), 'Action starting state mismatch.');
      yield* verifyAction(action);
      state = yield* applyTeachingSteps(engine, state, action.moves);
    }
    require(engine.equals(state, stage.after), 'Stage endpoint mismatch.');
    require(stage.checkpoint.passed &&
      runtime.checkStage(engine, state, stageId), 'Stage goal failed verification.');
    yield TEACHING_WORK;
  }
  require(engine.equals(state, trace.final) &&
    engine.isSolved(state), 'The replay must finish solved at its recorded endpoint.');
}
export function verifyTrace(engine: CubeEngine, trace: SolveTrace, runtime: MethodRuntime): void {
  return drainTeachingSteps(verifyTraceSteps(engine, trace, runtime));
}
