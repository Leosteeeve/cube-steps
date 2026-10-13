import type { CubeEngine, CubeState, FaceMove } from '../../../core/types';
export interface CrossCoordinate {
  positions: [number, number, number, number];
  orientations: [number, number, number, number];
}
export const CROSS_STATE_COUNT = 190080;
export const CROSS_MOVES: readonly FaceMove[] = [
  'U',
  "U'",
  'U2',
  'R',
  "R'",
  'R2',
  'F',
  "F'",
  'F2',
  'D',
  "D'",
  'D2',
  'L',
  "L'",
  'L2',
  'B',
  "B'",
  'B2',
];
export const CROSS_GOAL: CrossCoordinate = { positions: [4, 5, 6, 7], orientations: [0, 0, 0, 0] };
// Destination -> source in the Reid edge ordering. F/B reverse edge orientation.
const QUARTERS: Record<string, number[]> = {
  U: [1, 2, 3, 0, 4, 5, 6, 7, 8, 9, 10, 11],
  R: [0, 8, 2, 3, 4, 10, 6, 7, 5, 9, 1, 11],
  F: [9, 1, 2, 3, 8, 5, 6, 7, 0, 4, 10, 11],
  D: [0, 1, 2, 3, 7, 4, 5, 6, 8, 9, 10, 11],
  L: [0, 1, 2, 11, 4, 5, 6, 9, 8, 3, 10, 7],
  B: [0, 1, 10, 3, 4, 5, 11, 7, 8, 9, 6, 2],
};
const transitions = Object.fromEntries(
  CROSS_MOVES.map((move) => {
    const permutation = QUARTERS[move[0]],
      turns = move.endsWith('2') ? 2 : move.endsWith("'") ? 3 : 1;
    const positions: number[] = [],
      flips: number[] = [];
    for (let p = 0; p < 12; p++) {
      let destination = p,
        flip = 0;
      for (let t = 0; t < turns; t++) {
        const next = permutation.indexOf(destination);
        if ((move[0] === 'F' || move[0] === 'B') && next !== destination) flip ^= 1;
        destination = next;
      }
      positions.push(destination);
      flips.push(flip);
    }
    return [move, { positions, flips }];
  }),
) as Record<FaceMove, { positions: number[]; flips: number[] }>;
export function rankCross(c: CrossCoordinate): number {
  let permutation = 0,
    bits = 0;
  if (c.positions.length !== 4 || c.orientations.length !== 4)
    throw new Error('Invalid cross coordinate length.');
  for (let i = 0; i < 4; i++) {
    const p = c.positions[i],
      o = c.orientations[i];
    if (!Number.isInteger(p) || p < 0 || p >= 12 || (o !== 0 && o !== 1))
      throw new Error('Invalid cross position or orientation.');
    let digit = p;
    for (let j = 0; j < i; j++) {
      if (c.positions[j] === p) throw new Error('Cross edges cannot share a position.');
      if (c.positions[j] < p) digit--;
    }
    permutation = permutation * (12 - i) + digit;
    bits |= o << i;
  }
  return permutation * 16 + bits;
}
export function unrankCross(index: number): CrossCoordinate {
  if (!Number.isInteger(index) || index < 0 || index >= CROSS_STATE_COUNT)
    throw new Error('Invalid cross index.');
  const orientations = [0, 1, 2, 3].map((i) => (index >> i) & 1) as CrossCoordinate['orientations'];
  let permutation = Math.floor(index / 16);
  const digits = [0, 0, 0, 0],
    available = Array.from({ length: 12 }, (_, i) => i);
  for (let i = 3; i >= 0; i--) {
    digits[i] = permutation % (12 - i);
    permutation = Math.floor(permutation / (12 - i));
  }
  const positions = digits.map((d) => available.splice(d, 1)[0]) as CrossCoordinate['positions'];
  return { positions, orientations };
}
export function extractCross(engine: CubeEngine, state: CubeState): CrossCoordinate {
  const centers = engine.observe(state).centers;
  if (centers.D !== 'white' || centers.F !== 'green')
    throw new Error('Cross coordinates require the white-down, green-front frame.');
  // In this frame white F/R/B/L edges are immutable original UF/UL/UB/UR pieces.
  const positions = [0, 3, 2, 1].map((id) =>
    state.data.EDGES.pieces.indexOf(id),
  ) as CrossCoordinate['positions'];
  const orientations = positions.map(
    (p) => state.data.EDGES.orientation[p],
  ) as CrossCoordinate['orientations'];
  const c = { positions, orientations };
  rankCross(c);
  return c;
}
export function transitionCross(c: CrossCoordinate, move: FaceMove): CrossCoordinate {
  const t = transitions[move];
  if (!t) throw new Error('Cross transitions accept outer-face moves only.');
  return {
    positions: c.positions.map((p) => t.positions[p]) as CrossCoordinate['positions'],
    orientations: c.orientations.map(
      (o, i) => o ^ t.flips[c.positions[i]],
    ) as CrossCoordinate['orientations'],
  };
}
