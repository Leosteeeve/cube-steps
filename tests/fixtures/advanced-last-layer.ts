import type { CubeEngine, CubeState, Face, Color } from '../../src/core/types';
import { EDGE_SLOTS, CORNER_SLOTS } from '../../src/core/observations';
export const LL_SLOTS = ['UF', 'UR', 'UB', 'UL', 'UFR', 'URB', 'UBL', 'ULF'];
/** Read an independent sticker pattern, without inverting its algorithm. */
export function orientationFixture(engine: CubeEngine, yellowFaces: readonly string[]): CubeState {
  if (yellowFaces.length !== 8) throw new Error('Eight last-layer sticker directions required.');
  const state = structuredClone(engine.apply(engine.solved(), ['z2']));
  for (const [i, slot] of LL_SLOTS.entries()) {
    const orbit = i < 4 ? 'EDGES' : 'CORNERS',
      slots = i < 4 ? EDGE_SLOTS : CORNER_SLOTS,
      index = slots.indexOf(slot),
      size = i < 4 ? 2 : 3;
    let found = false;
    for (let orientation = 0; orientation < size; orientation++) {
      state.data[orbit].orientation[index] = orientation;
      const o = engine.observe(state),
        piece = (i < 4 ? o.edges : o.corners).find((p) => p.slot === slot)!;
      if (piece.stickers[yellowFaces[i] as Face] === 'yellow') {
        found = true;
        break;
      }
    }
    if (!found) throw new Error(`Invalid yellow direction ${slot}: ${yellowFaces[i]}`);
  }
  return state;
}
export function legalOLLOrientations(engine: CubeEngine): CubeState[] {
  const result: CubeState[] = [];
  for (let edges = 0; edges < 8; edges++)
    for (let corners = 0; corners < 27; corners++) {
      const state = structuredClone(engine.apply(engine.solved(), ['z2']));
      for (let i = 0; i < 3; i++) state.data.EDGES.orientation[i] = (edges >> i) & 1;
      state.data.EDGES.orientation[3] = state.data.EDGES.orientation
        .slice(0, 3)
        .reduce((a, b) => a ^ b, 0);
      let n = corners;
      for (let i = 0; i < 3; i++) {
        state.data.CORNERS.orientation[i] = n % 3;
        n = Math.floor(n / 3);
      }
      const sum = state.data.CORNERS.orientation.reduce((s, o, i) => (i === 3 ? s : s + o), 0);
      state.data.CORNERS.orientation[3] = (3 - (sum % 3)) % 3;
      result.push(state);
    }
  return result;
}
export function permuteLastLayer(
  state: CubeState,
  corners: readonly number[],
  edges: readonly number[],
): CubeState {
  const copy = structuredClone(state);
  for (let i = 0; i < 4; i++) {
    copy.data.CORNERS.pieces[i] = state.data.CORNERS.pieces[corners[i]];
    copy.data.EDGES.pieces[i] = state.data.EDGES.pieces[edges[i]];
  }
  return copy;
}
export function permutations(values: number[]): number[][] {
  return values.length
    ? values.flatMap((v, i) => permutations(values.filter((_, j) => i !== j)).map((p) => [v, ...p]))
    : [[]];
}
export function permutationParity(values: readonly number[]): number {
  let n = 0;
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) if (values[i] > values[j]) n ^= 1;
  return n;
}
export function legalPLLPermutations(engine: CubeEngine): CubeState[] {
  const base = engine.apply(engine.solved(), ['z2']),
    perms = permutations([0, 1, 2, 3]);
  return perms.flatMap((corners) =>
    perms
      .filter((edges) => permutationParity(edges) === permutationParity(corners))
      .map((edges) => permuteLastLayer(base, corners, edges)),
  );
}
export function permutationFixture(
  engine: CubeEngine,
  stickers: Record<string, Partial<Record<Face, Color>>>,
): CubeState {
  const state = structuredClone(engine.apply(engine.solved(), ['z2'])),
    solvedObservation = engine.observe(state);
  for (const slot of LL_SLOTS) {
    const orbit = slot.length === 2 ? 'EDGES' : 'CORNERS',
      slots = slot.length === 2 ? EDGE_SLOTS : CORNER_SLOTS;
    const candidates = slot.length === 2 ? solvedObservation.edges : solvedObservation.corners;
    const wanted: Partial<Record<Face, Color>> = { ...stickers[slot], U: 'yellow' };
    const piece = candidates.find((p) =>
      Object.values(wanted).every((color) => Object.values(p.stickers).includes(color)),
    );
    if (!piece) throw new Error(`No legal piece for PLL stickers at ${slot}.`);
    const index = slots.indexOf(slot);
    state.data[orbit].pieces[index] = slots.indexOf(piece.id);
    let matched = false;
    for (let o = 0; o < slot.length; o++) {
      state.data[orbit].orientation[index] = o;
      const obs = engine.observe(state),
        now = (slot.length === 2 ? obs.edges : obs.corners).find((p) => p.slot === slot)!;
      if (Object.entries(wanted).every(([face, color]) => now.stickers[face as Face] === color)) {
        matched = true;
        break;
      }
    }
    if (!matched) throw new Error(`Mirrored or invalid PLL stickers at ${slot}.`);
  }
  return state;
}
