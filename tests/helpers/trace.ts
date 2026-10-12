import type { CubeEngine } from '../../src/core/types';
import type { SolveTrace } from '../../src/core/types';
export function replayMatchesRecordedStates(engine:CubeEngine, trace:SolveTrace):boolean {
  let state=trace.initial;
  for (const stage of trace.stages) {
    if(!engine.equals(state,stage.before)) return false;
    for(const action of stage.actions) {
      if(!engine.equals(state,action.before))return false;
      state=engine.apply(state,action.moves);
      if(!engine.equals(state,action.after))return false;
    }
    if(!engine.equals(state,stage.after))return false;
  }
  return engine.equals(state,trace.final);
}
