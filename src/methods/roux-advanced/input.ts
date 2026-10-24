import type { CubeEngine, SolveInput } from '../../core/types';
import { prepareLabInput, freezeLabValue } from '../../lab/input';
import type { RouxInput } from './types';
import {
  TEACHING_WORK,
  drainTeachingSteps,
  applyTeachingSteps,
  type TeachingWork,
} from '../shared/work';
import { fingerprintLabState } from '../../lab/input';
import { resolveSolveInput } from '../../core/solve-input';
export function prepareRouxInput(engine: CubeEngine, source: SolveInput): RouxInput {
  return drainTeachingSteps(prepareRouxInputSteps(engine, source));
}
export function* prepareRouxInputSteps(
  engine: CubeEngine,
  source: SolveInput,
): Generator<TeachingWork, RouxInput> {
  const copy = structuredClone(source);
  if (
    copy.kind === 'scramble' &&
    (!Array.isArray(copy.moves) ||
      copy.moves.length > 1000 ||
      copy.moves.some((m) => typeof m !== 'string' || !/^[UDLRFB][2']?$/.test(m)))
  )
    throw Error('The initial scramble contains an unsupported move or too many turns.');
  const initial =
    copy.kind === 'scramble'
      ? yield* applyTeachingSteps(engine, engine.solved(), copy.moves)
      : resolveSolveInput(engine, copy);
  yield TEACHING_WORK;
  return freezeLabValue({
    source: copy,
    initial,
    fingerprint: fingerprintLabState(initial),
    setupMoves: copy.kind === 'scramble' ? [...copy.moves] : null,
  });
}
