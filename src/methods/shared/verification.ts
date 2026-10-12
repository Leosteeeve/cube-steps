import type { CubeEngine, SolveTrace, StageId } from '../../core/types';
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
    for (const action of stage.actions) {
      require(engine.equals(state, action.before), 'Action starting state mismatch.');
      require(action.moves.length > 0 &&
        action.moves.every(isTeachingMove), 'Invalid teaching moves.');
      require(Boolean(
        action.recognition && action.explanation && action.ruleId && action.caseId,
      ), 'Missing teaching explanation.');
      require(action.kind !== 'regrip' ||
        action.moves.every((m) => /^[xyz]/.test(m)), 'A regrip must rotate the whole cube.');
      if (action.kind === 'algorithm') {
        const algorithm = runtime.presentation.algorithms[action.algorithmId ?? ''];
        require(Boolean(algorithm) &&
          algorithm.moves.join(' ') ===
            action.moves.join(' '), 'Algorithm does not match its method catalog.');
      } else
        require(action.algorithmId ===
          undefined, 'Only algorithm actions may reference a formula.');
      state = engine.apply(state, action.moves);
      require(engine.equals(state, action.after), 'Action endpoint mismatch.');
      require(action.checkpoint.passed &&
        runtime.checkAction(
          engine,
          action,
          stageId,
        ), 'Action precondition or effect failed verification.');
    }
    require(engine.equals(state, stage.after), 'Stage endpoint mismatch.');
    require(stage.checkpoint.passed &&
      runtime.checkStage(engine, state, stageId), 'Stage goal failed verification.');
  }
  require(engine.equals(state, trace.final) &&
    engine.isSolved(state), 'The replay must finish solved at its recorded endpoint.');
}
