import type { CubeEngine, SolveTrace } from '../core/types';
import { flattenTrace } from '../methods/shared/trace';
export function createTimeline(engine: CubeEngine, trace: SolveTrace) {
  const flat = flattenTrace(trace),
    states = [trace.initial];
  for (const move of flat.moves) states.push(engine.apply(states[states.length - 1], [move]));
  return { ...flat, states };
}
