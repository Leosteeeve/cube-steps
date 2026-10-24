import type { CubeEngine, CubeState, TeachingMove } from '../../core/types';
export const TEACHING_WORK = Object.freeze({ kind: 'work' as const });
export type TeachingWork = typeof TEACHING_WORK;
export function drainTeachingSteps<T>(steps: Generator<TeachingWork, T>): T {
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}
export function* applyTeachingSteps(
  e: CubeEngine,
  initial: CubeState,
  moves: readonly TeachingMove[],
): Generator<TeachingWork, CubeState> {
  let state = initial;
  for (const move of moves) {
    state = e.apply(state, [move]);
    yield TEACHING_WORK;
  }
  return state;
}
