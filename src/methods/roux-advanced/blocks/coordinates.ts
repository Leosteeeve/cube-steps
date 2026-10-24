import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { createRouxFrameMap } from '../frames';
import type { RouxFrame } from '../types';
import effects from '../data/move-effects.json';
export const STM_MOVES = Object.freeze(effects.moves.map((e) => e.move as TeachingMove));
export const EDGE_COORDINATES = 10560,
  CORNER_COORDINATES = 504,
  BLOCK_COORDINATES = 5322240;
function rank(positions: number[], orientations: number[], size: number, base: number): number {
  let p = 0,
    o = 0;
  for (let i = 0; i < positions.length; i++) {
    let digit = positions[i];
    for (let j = 0; j < i; j++) if (positions[j] < positions[i]) digit--;
    p = p * (size - i) + digit;
    o = o * base + orientations[i];
  }
  return p * base ** positions.length + o;
}
function unrank(
  index: number,
  size: number,
  count: number,
  base: number,
): { positions: number[]; orientations: number[] } {
  const scale = base ** count;
  let p = Math.floor(index / scale),
    o = index % scale;
  const digits = Array(count),
    orientations = Array(count);
  for (let i = count - 1; i >= 0; i--) {
    digits[i] = p % (size - i);
    p = Math.floor(p / (size - i));
    orientations[i] = o % base;
    o = Math.floor(o / base);
  }
  const available = Array.from({ length: size }, (_, i) => i);
  return { positions: digits.map((d) => available.splice(d, 1)[0]), orientations };
}
function read(
  state: CubeState,
  orbit: 'EDGES' | 'CORNERS',
  targets: readonly number[],
  size: number,
  base: number,
): number {
  const positions = targets.map((id) => state.data[orbit].pieces.indexOf(id));
  if (positions.some((p) => p < 0)) throw Error('Missing Roux block target.');
  return rank(
    positions,
    positions.map((p) => state.data[orbit].orientation[p]),
    size,
    base,
  );
}
export function readFirstBlockCoordinate(
  engine: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
): number {
  const canonical = createRouxFrameMap(engine, frame.id).toCanonical(state);
  return (
    read(canonical, 'EDGES', effects.edgeTargets, 12, 2) * CORNER_COORDINATES +
    read(canonical, 'CORNERS', effects.cornerTargets, 8, 3)
  );
}
function stepPart(index: number, moveIndex: number, orbit: 'EDGES' | 'CORNERS'): number {
  const edge = orbit === 'EDGES',
    size = edge ? 12 : 8,
    count = edge ? 3 : 2,
    base = edge ? 2 : 3;
  const { positions, orientations } = unrank(index, size, count, base),
    t = effects.moves[moveIndex][orbit];
  const next = positions.map((p) => t.pieces.indexOf(p));
  return rank(
    next,
    next.map((p, i) => (orientations[i] + t.orientation[p]) % base),
    size,
    base,
  );
}
export function stepFirstBlockCoordinate(index: number, move: TeachingMove): number {
  if (!Number.isInteger(index) || index < 0 || index >= BLOCK_COORDINATES)
    throw Error('Invalid block coordinate.');
  const i = STM_MOVES.indexOf(move);
  if (i < 0) throw Error('Reference search permits only STM primitive turns.');
  return (
    stepPart(Math.floor(index / CORNER_COORDINATES), i, 'EDGES') * CORNER_COORDINATES +
    stepPart(index % CORNER_COORDINATES, i, 'CORNERS')
  );
}
/** Offline generator only: compact factorized transitions, not a full 45-way table. */
export function buildBlockTransitions() {
  const edges = new Uint16Array(EDGE_COORDINATES * STM_MOVES.length),
    corners = new Uint16Array(CORNER_COORDINATES * STM_MOVES.length);
  for (let i = 0; i < EDGE_COORDINATES; i++)
    for (let m = 0; m < STM_MOVES.length; m++) edges[i * 45 + m] = stepPart(i, m, 'EDGES');
  for (let i = 0; i < CORNER_COORDINATES; i++)
    for (let m = 0; m < STM_MOVES.length; m++) corners[i * 45 + m] = stepPart(i, m, 'CORNERS');
  return { edges, corners };
}
