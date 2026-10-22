import type { CubeEngine, CubeState, TeachingMove } from '../../src/core/types';
// Every fixture is a legal replay from the explicitly held solved cube.
const fixtures: Readonly<Record<string, readonly TeachingMove[]>> = {
  'first-block-slice-assist': ['D', "M'"],
  'second-block-slice-assist': ['R2', 'U', 'M'],
  'broken-left-block': ['L'],
  'middle-quarter': ['M'],
  'middle-half': ['M2'],
  'middle-inverse': ["M'"],
  'upper-quarter': ['U'],
  'upper-half': ['U2'],
  'upper-inverse': ["U'"],
};
export function rouxFixture(engine: CubeEngine, id: string): CubeState {
  const moves = fixtures[id];
  if (!moves) throw new Error(`Unknown Roux fixture: ${id}`);
  return engine.apply(engine.solved(), ['x2', 'y', ...moves]);
}
