import { puzzles } from 'cubing/puzzles';
import { KPattern } from 'cubing/kpuzzle';
import { Alg } from 'cubing/alg';
import { observeState } from './observations';
import type { CubeEngine, CubeState } from './types';
import { copyCubeState } from './state';
export async function createCubeEngine(): Promise<CubeEngine> {
  const puzzle = await puzzles['3x3x3'].kpuzzle();
  const pattern = (state: CubeState) => new KPattern(puzzle, state.data);
  return {
    solved: () => copyCubeState(puzzle.defaultPattern().patternData),
    apply: (state, moves) =>
      copyCubeState(pattern(state).applyAlg(new Alg(moves.join(' '))).patternData),
    observe: observeState,
    isSolved: (state) =>
      pattern(state).experimentalIsSolved({
        ignorePuzzleOrientation: true,
        ignoreCenterOrientation: true,
      }),
    equals: (a, b) => pattern(a).isIdentical(pattern(b)),
  };
}
