import type {
  Color,
  CubeEngine,
  CubeState,
  PieceObservation,
  StageId,
  LBLStageId,
} from '../../core/types';
import { pieceSolved, piecePositioned } from '../shared/pieces';
export const LBL_STAGE_IDS: LBLStageId[] = [
  'white-cross',
  'first-layer',
  'middle-layer',
  'top-cross',
  'top-edges',
  'top-corners',
  'corner-orientation',
];
export { pieceSolved, piecePositioned } from '../shared/pieces';
export function checkStage(engine: CubeEngine, state: CubeState, id: StageId): boolean {
  const stageIndex = LBL_STAGE_IDS.indexOf(id as LBLStageId);
  if (stageIndex < 0) return false;
  const obs = engine.observe(state);
  const has = (piece: PieceObservation, color: Color) =>
    Object.values(piece.stickers).includes(color);
  const checks = [
    () => obs.edges.every((p) => !has(p, 'white') || pieceSolved(p, obs)),
    () => obs.corners.every((p) => !has(p, 'white') || pieceSolved(p, obs)),
    () => obs.edges.every((p) => has(p, 'white') || has(p, 'yellow') || pieceSolved(p, obs)),
    () =>
      obs.edges
        .filter((p) => has(p, 'yellow'))
        .every((p) =>
          Object.entries(p.stickers).some(
            ([f, c]) => c === 'yellow' && obs.centers[f as keyof typeof obs.centers] === 'yellow',
          ),
        ),
    () => obs.edges.every((p) => pieceSolved(p, obs)),
    () => obs.corners.every((p) => piecePositioned(p, obs)),
    () => engine.isSolved(state),
  ];
  return checks.slice(0, stageIndex + 1).every((check) => check());
}
