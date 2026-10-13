import { puzzles } from 'cubing/puzzles';
import { KPattern, type KTransformation } from 'cubing/kpuzzle';
import { Alg } from 'cubing/alg';
import { observeState } from './observations';
import type { CubeEngine, CubeState } from './types';
import { copyCubeState } from './state';
export async function createCubeEngine(): Promise<CubeEngine> {
  const puzzle = await puzzles['3x3x3'].kpuzzle();
  const pattern = (state: CubeState) => new KPattern(puzzle, state.data);
  // A formula's transformation is independent of its input state. Bound this
  // cache because pasted scrambles can introduce arbitrary new sequences.
  const transformations = new Map<string, KTransformation>();
  return {
    solved: () => copyCubeState(puzzle.defaultPattern().patternData),
    apply: (state, moves) => {
      const key = moves.join(' ');
      let transformation = transformations.get(key);
      if (!transformation) {
        transformation = puzzle.algToTransformation(new Alg(key));
        if (transformations.size >= 1024)
          transformations.delete(transformations.keys().next().value!);
        transformations.set(key, transformation);
      }
      return copyCubeState(pattern(state).applyTransformation(transformation).patternData);
    },
    observe: observeState,
    isSolved: (state) =>
      pattern(state).experimentalIsSolved({
        ignorePuzzleOrientation: true,
        ignoreCenterOrientation: true,
      }),
    equals: (a, b) => pattern(a).isIdentical(pattern(b)),
  };
}
