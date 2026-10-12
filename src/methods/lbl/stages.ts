import type {
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
  if (!LBL_STAGE_IDS.includes(id as LBLStageId)) return false;
  const obs = engine.observe(state);
  const has = (piece: PieceObservation, color: string) =>
    Object.values(piece.stickers).includes(color as never);
  const whiteEdges = obs.edges.filter((p) => has(p, 'white'));
  const whiteCorners = obs.corners.filter((p) => has(p, 'white'));
  const middleEdges = obs.edges.filter((p) => !has(p, 'white') && !has(p, 'yellow'));
  const checks = [
    whiteEdges.every((p) => pieceSolved(p, obs)),
    whiteCorners.every((p) => pieceSolved(p, obs)),
    middleEdges.every((p) => pieceSolved(p, obs)),
    obs.edges
      .filter((p) => has(p, 'yellow'))
      .every((p) =>
        Object.entries(p.stickers).some(
          ([f, c]) => c === 'yellow' && obs.centers[f as keyof typeof obs.centers] === 'yellow',
        ),
      ),
    obs.edges.every((p) => pieceSolved(p, obs)),
    obs.corners.every((p) => piecePositioned(p, obs)),
    engine.isSolved(state),
  ];
  return checks.slice(0, LBL_STAGE_IDS.indexOf(id as LBLStageId) + 1).every(Boolean);
}
