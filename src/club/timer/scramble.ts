import { parseScramble } from '../../core/notation';
import { stateToFacelets } from '../../core/facelets';
import type { CubeEngine } from '../../core/types';
import type { PreparedScramble } from './types';
export function prepareTimerScramble(
  engine: CubeEngine,
  text: string,
  id: string,
): PreparedScramble {
  const parsed = parseScramble(text);
  if (!parsed.ok || !parsed.moves.length)
    throw new Error('The scramble could not be read. Generate a new one.');
  const state = engine.apply(engine.solved(), parsed.moves);
  return Object.freeze({ id, text, state, facelets: stateToFacelets(state) });
}
