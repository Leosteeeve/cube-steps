import type { TeachingMove } from './types';
import { isTeachingMove } from './teaching-moves';
export function countTeachingMoves(moves: readonly TeachingMove[]): {
  faceTurnEquivalents: number;
  rotations: number;
} {
  let faceTurnEquivalents = 0,
    rotations = 0;
  for (const move of moves) {
    if (!isTeachingMove(move)) throw new Error(`Cannot count invalid teaching move: ${move}`);
    if (/^[xyz]/.test(move)) rotations++;
    else faceTurnEquivalents += /^[MES]/.test(move) ? 2 : 1;
  }
  return { faceTurnEquivalents, rotations };
}
