import type {
  CubeEngine,
  CubeObservation,
  CubeState,
  Face,
  PieceObservation,
} from '../../core/types';
export function pieceSolved(piece: PieceObservation, observation: CubeObservation): boolean {
  return Object.entries(piece.stickers).every(
    ([face, color]) => observation.centers[face as Face] === color,
  );
}
export function piecePositioned(piece: PieceObservation, observation: CubeObservation): boolean {
  return Object.values(piece.stickers).every((color) =>
    [...piece.slot].some((face) => observation.centers[face as Face] === color),
  );
}
export function whiteCrossSolved(engine: CubeEngine, state: CubeState): boolean {
  const o = engine.observe(state);
  return o.edges
    .filter((p) => Object.values(p.stickers).includes('white'))
    .every((p) => pieceSolved(p, o));
}
export function firstTwoLayersSolved(engine: CubeEngine, state: CubeState): boolean {
  const o = engine.observe(state);
  return [...o.edges, ...o.corners]
    .filter((p) => !Object.values(p.stickers).includes('yellow'))
    .every((p) => pieceSolved(p, o));
}
