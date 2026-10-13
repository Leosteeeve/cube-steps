import type { CubeEngine, CubeState, Face } from '../../src/core/types';
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
