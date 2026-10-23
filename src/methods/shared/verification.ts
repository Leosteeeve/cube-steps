import type { CubeEngine, SolveTrace, StageId, TraceAction } from '../../core/types';
import { joinTeachingActions } from './connected-actions';
import { isTeachingMove } from '../../core/teaching-moves';
import type { MethodRuntime } from '../contracts';
import { RuleError } from './trace';
export function verifyTrace(engine: CubeEngine, trace: SolveTrace, runtime: MethodRuntime): void {
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
    const verifyAction = (action: TraceAction, allowJoined = true) => {
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
        for (const source of action.joined!.sources) verifyAction(source, false);
        const expected = joinTeachingActions(engine, action.joined!.sources);
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
        engine.apply(action.before, action.moves),
        action.after,
      ), 'Action endpoint mismatch.');
      require(action.checkpoint.passed &&
        runtime.checkAction(
          engine,
          action,
          stageId,
        ), 'Action precondition or effect failed verification.');
    };
    for (const action of stage.actions) {
      require(engine.equals(state, action.before), 'Action starting state mismatch.');
      verifyAction(action);
      state = engine.apply(state, action.moves);
    }
    require(engine.equals(state, stage.after), 'Stage endpoint mismatch.');
    require(stage.checkpoint.passed &&
      runtime.checkStage(engine, state, stageId), 'Stage goal failed verification.');
  }
  require(engine.equals(state, trace.final) &&
    engine.isSolved(state), 'The replay must finish solved at its recorded endpoint.');
}
