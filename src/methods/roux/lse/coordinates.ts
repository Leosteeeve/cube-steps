import type { CubeEngine, CubeState } from '../../../core/types';
import { copyCubeState } from '../../../core/state';
import { blockComplete, cornerOffset } from '../predicates';
import { observeRouxFrame, rouxReferenceState } from '../frame';
export const LSE_SLOTS = [0, 1, 2, 3, 4, 6] as const;
export interface LseCoordinate {
  edges: number[];
  flips: number[];
  phase: number;
  offset: number;
}
export const permutationParity = (a: readonly number[]) =>
  a.reduce((n, v, i) => n + a.slice(i + 1).filter((w) => w < v).length, 0) % 2;
function permutations(a: number[]): number[][] {
  return a.length
    ? a.flatMap((v, i) => permutations(a.filter((_, j) => j !== i)).map((p) => [v, ...p]))
    : [[]];
}
export const LSE_PERMUTATIONS = permutations([0, 1, 2, 3, 4, 5]);
const permCodes = new Int16Array(46656).fill(-1);
const permCode = (a: readonly number[]) => a.reduce((n, v) => n * 6 + v, 0);
LSE_PERMUTATIONS.forEach((p, i) => {
  permCodes[permCode(p)] = i;
});
export const LSE_DENSE_SIZE = 720 * 32 * 4 * 4;
export function validLseCoordinate(c: LseCoordinate): boolean {
  return (
    !!c &&
    Array.isArray(c.edges) &&
    c.edges.length === 6 &&
    new Set(c.edges).size === 6 &&
    c.edges.every((n) => Number.isInteger(n) && n >= 0 && n < 6) &&
    Array.isArray(c.flips) &&
    c.flips.length === 6 &&
    c.flips.every((n) => n === 0 || n === 1) &&
    c.flips.reduce<number>((a, b) => a + b, 0) % 2 === 0 &&
    Number.isInteger(c.phase) &&
    c.phase >= 0 &&
    c.phase < 4 &&
    Number.isInteger(c.offset) &&
    c.offset >= 0 &&
    c.offset < 4 &&
    permutationParity(c.edges) === (c.phase + c.offset) % 2
  );
}
export function lseIndex(c: LseCoordinate): number {
  const permutation = permCodes[permCode(c.edges)];
  const orientation = c.flips.slice(0, 5).reduce((n, v, i) => n + (v << i), 0);
  return ((permutation * 32 + orientation) * 4 + c.phase) * 4 + c.offset;
}
export function lseAt(code: number): LseCoordinate {
  const offset = code % 4,
    phase = Math.floor(code / 4) % 4,
    orientation = Math.floor(code / 16) % 32;
  const flips = Array.from({ length: 5 }, (_, i) => (orientation >> i) & 1);
  flips.push(flips.reduce((a, b) => a ^ b, 0));
  return { edges: [...LSE_PERMUTATIONS[Math.floor(code / 512)]], flips, phase, offset };
}
export function encodeLse(engine: CubeEngine, state: CubeState): LseCoordinate | null {
  try {
    if (!blockComplete(engine, state, 'left') || !blockComplete(engine, state, 'right'))
      return null;
    const offset = cornerOffset(engine, state),
      phase = observeRouxFrame(engine, state).centerPhase;
    if (offset === null || phase === null) return null;
    const ref = rouxReferenceState(engine).data.EDGES,
      ids = LSE_SLOTS.map((s) => ref.pieces[s]);
    const edges = LSE_SLOTS.map((s) => ids.indexOf(state.data.EDGES.pieces[s]));
    const flips = LSE_SLOTS.map(
      (s, i) => state.data.EDGES.orientation[s] ^ ref.orientation[LSE_SLOTS[edges[i]]],
    );
    const c = { edges, flips, phase, offset };
    return validLseCoordinate(c) ? c : null;
  } catch {
    return null;
  }
}
export function decodeLse(engine: CubeEngine, c: LseCoordinate): CubeState {
  if (!validLseCoordinate(c)) throw Error('Invalid Roux LSE coordinate or parity.');
  const ref = rouxReferenceState(engine),
    state = structuredClone(
      engine.apply(ref, [...Array(c.phase).fill('M'), ...Array(c.offset).fill('U')]),
    );
  for (let i = 0; i < 6; i++) {
    const source = LSE_SLOTS[c.edges[i]],
      dest = LSE_SLOTS[i];
    state.data.EDGES.pieces[dest] = ref.data.EDGES.pieces[source];
    state.data.EDGES.orientation[dest] = ref.data.EDGES.orientation[source] ^ c.flips[i];
  }
  return copyCubeState(state.data);
}
