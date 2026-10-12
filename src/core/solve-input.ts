import type { CubeEngine, CubeState, SolveInput, SolveSession } from './types';
import { validateFacelets } from './facelets';
export function resolveSolveInput(engine: CubeEngine, input: SolveInput): CubeState {
  if (input.kind === 'scramble') {
    if (
      !Array.isArray(input.moves) ||
      input.moves.some((move) => typeof move !== 'string' || !/^[UDLRFB](?:'|2)?$/.test(move))
    )
      throw new Error('The initial scramble contains an unsupported move.');
    return engine.apply(engine.solved(), input.moves);
  }
  if (input.kind !== 'facelets') throw new Error('The initial input type is unsupported.');
  const result = validateFacelets(input.facelets, engine.solved());
  if (!result.ok) throw new Error(`The initial colors are invalid: ${result.issues[0].message}`);
  return result.state;
}
export function assertSessionInput(engine: CubeEngine, session: SolveSession): void {
  if (!engine.equals(resolveSolveInput(engine, session.input), session.trace.initial))
    throw new Error('The initial input does not match this solution trace.');
}
