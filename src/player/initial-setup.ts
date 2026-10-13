import type { CubeEngine, SolveSession, TeachingMove } from '../core/types';
import { assertSessionInput } from '../core/solve-input';
import { flattenTrace } from '../methods/shared/trace';
import { invertTeachingMoves } from '../core/teaching-moves';
import type { PlaybackSource } from './playback-source';
import { verifyDemonstration } from '../algorithms/demonstration';
export function buildPlaybackInitialSetup(
  engine: CubeEngine,
  source: PlaybackSource,
): TeachingMove[] {
  if (source.kind === 'solve') return buildInitialSetup(engine, source.session);
  verifyDemonstration(engine, source.demonstration);
  return [...source.demonstration.setup, ...source.demonstration.holdingMoves];
}
export function buildInitialSetup(engine: CubeEngine, session: SolveSession): TeachingMove[] {
  assertSessionInput(engine, session);
  const moves = flattenTrace(session.trace).moves;
  const end = engine.apply(session.trace.initial, moves);
  if (!engine.equals(end, session.trace.final))
    throw new Error('Unable to initialize the cube: the trace endpoint does not match.');
  if (!engine.isSolved(end))
    throw new Error('Unable to initialize the cube: the trace does not finish solved.');
  if (session.input.kind === 'scramble') return [...session.input.moves];
  const orientations = [{ state: engine.solved(), moves: [] as TeachingMove[] }];
  for (let index = 0; index < orientations.length && orientations.length < 24; index++) {
    for (const rotation of ['x', 'y'] as const) {
      const state = engine.apply(orientations[index].state, [rotation]);
      if (!orientations.some((candidate) => engine.equals(candidate.state, state)))
        orientations.push({ state, moves: [...orientations[index].moves, rotation] });
    }
  }
  const orientation = orientations.find((candidate) => engine.equals(candidate.state, end));
  if (!orientation)
    throw new Error('Unable to initialize the cube: no matching solved holding orientation.');
  const inverse = invertTeachingMoves(moves);
  const setup = [...orientation.moves, ...inverse];
  if (!engine.equals(engine.apply(engine.solved(), setup), session.trace.initial))
    throw new Error('Unable to initialize the cube: the starting colors do not match.');
  return setup;
}
