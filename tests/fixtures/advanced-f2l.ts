import type { CubeEngine, CubeState } from '../../src/core/types';
import { CORNER_SLOTS, EDGE_SLOTS } from '../../src/core/observations';
import type { F2LTarget } from '../../src/methods/advanced/f2l/types';
import { observeF2LPairs } from '../../src/methods/cfop/f2l-cases';
function parity(p: number[]): number {
  let n = 0;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) n ^= 1;
  return n;
}
/** Independent legal placement, never an inverse of the formula being admitted. */
export function pairPlacement(
  engine: CubeEngine,
  target: F2LTarget,
  cornerSlot: string,
  cornerOrientation: number,
  edgeSlot: string,
  edgeOrientation: number,
): CubeState {
  const state = structuredClone(engine.apply(engine.solved(), ['z2']));
  function place(
    orbit: string,
    slots: string[],
    id: string,
    destination: string,
    orientation: number,
    mod: number,
  ) {
    const data = state.data[orbit],
      piece = slots.indexOf(id),
      from = data.pieces.indexOf(piece),
      to = slots.indexOf(destination);
    [data.pieces[from], data.pieces[to]] = [data.pieces[to], data.pieces[from]];
    data.orientation[to] = orientation;
    const free = slots.findIndex((s, i) => s.includes('U') && i !== to);
    const sum = data.orientation.reduce((a, b) => a + b, 0);
    data.orientation[free] = (data.orientation[free] - (sum % mod) + mod) % mod;
  }
  place('CORNERS', CORNER_SLOTS, target.cornerId, cornerSlot, cornerOrientation, 3);
  place('EDGES', EDGE_SLOTS, target.edgeId, edgeSlot, edgeOrientation, 2);
  if (parity(state.data.CORNERS.pieces) !== parity(state.data.EDGES.pieces)) {
    const free = [0, 1, 2, 3].filter(
      (i) => state.data.CORNERS.pieces[i] !== CORNER_SLOTS.indexOf(target.cornerId),
    );
    const [a, b] = free;
    [state.data.CORNERS.pieces[a], state.data.CORNERS.pieces[b]] = [
      state.data.CORNERS.pieces[b],
      state.data.CORNERS.pieces[a],
    ];
  }
  return state;
}
export function canonicalTargets(engine: CubeEngine): F2LTarget[] {
  return observeF2LPairs(engine, engine.apply(engine.solved(), ['z2'])) as F2LTarget[];
}
export function admissiblePairPlacements(engine: CubeEngine, target: F2LTarget): CubeState[] {
  const home = CORNER_SLOTS.find(
    (s) => s.includes('D') && [...target.slot].every((f) => s.includes(f)),
  )!;
  const result: CubeState[] = [];
  for (const cornerSlot of [...CORNER_SLOTS.slice(0, 4), home])
    for (let co = 0; co < 3; co++) {
      for (const edgeSlot of [...EDGE_SLOTS.slice(0, 4), target.slot])
        for (let eo = 0; eo < 2; eo++)
          result.push(pairPlacement(engine, target, cornerSlot, co, edgeSlot, eo));
    }
  return result;
}
