import { puzzles } from 'cubing/puzzles';
import { KPattern } from 'cubing/kpuzzle';
import { Alg } from 'cubing/alg';
import { observeState } from './observations';
import type { CubeEngine, CubeState } from './types';
function copyState(data: CubeState['data']): CubeState {
  const copy = structuredClone(data);
  for (const orbit of Object.values(copy)) {
    Object.freeze(orbit.pieces); Object.freeze(orbit.orientation);
    if (orbit.orientationMod) Object.freeze(orbit.orientationMod);
    Object.freeze(orbit);
  }
  return Object.freeze({data:Object.freeze(copy)});
}
export async function createCubeEngine(): Promise<CubeEngine> {
  const puzzle = await puzzles['3x3x3'].kpuzzle();
  const pattern = (state: CubeState) => new KPattern(puzzle,state.data);
  return {
    solved: () => copyState(puzzle.defaultPattern().patternData),
    apply: (state,moves) => copyState(pattern(state).applyAlg(new Alg(moves.join(' '))).patternData),
    observe: observeState,
    isSolved: state => pattern(state).experimentalIsSolved({ignorePuzzleOrientation:true,ignoreCenterOrientation:true}),
    equals: (a,b) => pattern(a).isIdentical(pattern(b)),
  };
}
