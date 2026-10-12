import type { CubeEngine, SolveTrace } from '../core/types';
import { flattenTrace } from '../methods/shared/trace';
import { getMethod } from '../methods/registry';
export function createTimeline(engine: CubeEngine, trace: SolveTrace) {
  const method = getMethod(trace.method);
  if (!trace.stages.length) throw new Error('The solution has no method stages.');
  for (const stage of trace.stages) for (const action of stage.actions) if (action.kind === 'algorithm') {
    const algorithm = method.algorithms[action.algorithmId ?? ''];
    if (!algorithm || algorithm.moves.join(' ') !== action.moves.join(' ')) throw new Error('The algorithm reference does not match this method or its displayed moves.');
  }
  const flat = flattenTrace(trace),
    states = [trace.initial];
  for (const move of flat.moves) states.push(engine.apply(states[states.length - 1], [move]));
  return { ...flat, states };
}
