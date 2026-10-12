import type { CubeEngine, CubeState } from '../../src/core/types';
// Independent cubie fixtures in the input's canonical white-up frame.
// Only yellow-layer cubies change; sums and permutation parity remain legal.
export function orientationFixtures(engine: CubeEngine): CubeState[] {
  const states: CubeState[] = [];
  for (let edges = 0; edges < 8; edges++)
    for (let corners = 0; corners < 27; corners++) {
      const state = structuredClone(engine.solved());
      const eo = [edges & 1, (edges >> 1) & 1, (edges >> 2) & 1];
      eo.push(eo.reduce((a, b) => a ^ b, 0));
      const co = [corners % 3, Math.floor(corners / 3) % 3, Math.floor(corners / 9)];
      co.push((3 - (co.reduce((a, b) => a + b, 0) % 3)) % 3);
      state.data.EDGES.orientation.splice(4, 4, ...eo);
      state.data.CORNERS.orientation.splice(4, 4, ...co);
      states.push(state);
    }
  return states;
}
export function permutations(values: number[]): number[][] {
  return values.length
    ? values.flatMap((n, i) =>
        permutations(values.filter((_, j) => i !== j)).map((tail) => [n, ...tail]),
      )
    : [[]];
}
export function parity(values: number[]): number {
  return values.reduce((n, a, i) => n + values.slice(i + 1).filter((b) => b < a).length, 0) % 2;
}
export function permutationFixtures(engine: CubeEngine): CubeState[] {
  const states: CubeState[] = [],
    p = permutations([4, 5, 6, 7]);
  for (const corners of p)
    for (const edges of p)
      if (parity(corners) === parity(edges)) {
        const state = structuredClone(engine.solved());
        state.data.EDGES.pieces.splice(4, 4, ...edges);
        state.data.CORNERS.pieces.splice(4, 4, ...corners);
        states.push(state);
      }
  return states;
}
export function upperPairFixtures(engine: CubeEngine): CubeState[] {
  const states: CubeState[] = [];
  for (let corner = 0; corner < 4; corner++)
    for (let twist = 0; twist < 3; twist++)
      for (let edge = 0; edge < 4; edge++)
        for (let flip = 0; flip < 2; flip++) {
          const state = structuredClone(engine.apply(engine.solved(), ['x2']));
          const c = state.data.CORNERS,
            e = state.data.EDGES;
          [c.pieces[4], c.pieces[corner]] = [c.pieces[corner], c.pieces[4]];
          [e.pieces[8], e.pieces[edge]] = [e.pieces[edge], e.pieces[8]];
          c.orientation[corner] = twist;
          c.orientation[(corner + 1) % 4] = (3 - twist) % 3;
          e.orientation[edge] = flip;
          e.orientation[(edge + 1) % 4] = flip;
          states.push(state);
        }
  return states;
}
