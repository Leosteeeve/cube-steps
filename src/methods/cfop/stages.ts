import type {
  CubeEngine,
  CubeState,
  StageId,
  CFOPStageId,
  CubeObservation,
  Face,
  TeachingMove,
} from '../../core/types';
import { firstTwoLayersSolved, whiteCrossSolved } from '../shared/pieces';
export const CFOP_STAGE_IDS: readonly CFOPStageId[] = [
  'cfop-cross',
  'cfop-f2l',
  'cfop-oll-edges',
  'cfop-oll-corners',
  'cfop-pll-corners',
  'cfop-pll-edges',
  'cfop-auf',
];
export const TOP_EDGES = ['UF', 'UR', 'UB', 'UL'];
export const TOP_CORNERS = ['UFR', 'URB', 'UBL', 'ULF'];
const SIDES: Face[] = ['F', 'R', 'B', 'L'];
export function whiteDownMoves(engine: CubeEngine, state: CubeState): TeachingMove[] {
  for (const moves of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][]) {
    if (engine.observe(engine.apply(state, moves)).centers.D === 'white') return moves;
  }
  throw new Error('No white center found.');
}
export function relativePermutation(o: CubeObservation): { corners: number[]; edges: number[] } {
  const corners = TOP_CORNERS.map((slot) => {
    const colors = Object.values(o.corners.find((p) => p.slot === slot)!.stickers);
    return SIDES.findIndex(
      (face, i) =>
        colors.includes(o.centers[face]) && colors.includes(o.centers[SIDES[(i + 1) % 4]]),
    );
  });
  const offset = corners[0];
  const edges = TOP_EDGES.map((slot) => {
    const colors = Object.values(o.edges.find((p) => p.slot === slot)!.stickers);
    return (SIDES.findIndex((face) => colors.includes(o.centers[face])) - offset + 4) % 4;
  });
  return { corners: corners.map((i) => (i - offset + 4) % 4), edges };
}
export function checkCFOPStage(engine: CubeEngine, state: CubeState, stage: StageId): boolean {
  const index = CFOP_STAGE_IDS.indexOf(stage as CFOPStageId);
  if (index < 0 || !whiteCrossSolved(engine, state)) return false;
  if (index === 0) return true;
  if (!firstTwoLayersSolved(engine, state)) return false;
  if (index === 1) return true;
  const o = engine.observe(engine.apply(state, whiteDownMoves(engine, state)));
  if (!o.edges.filter((p) => p.slot.includes('U')).every((p) => p.stickers.U === 'yellow'))
    return false;
  if (index === 2) return true;
  if (!o.corners.filter((p) => p.slot.includes('U')).every((p) => p.stickers.U === 'yellow'))
    return false;
  if (index === 3) return true;
  const permutation = relativePermutation(o);
  if (!permutation.corners.every((home, i) => home === i)) return false;
  if (index === 4) return true;
  if (!permutation.edges.every((home, i) => home === i)) return false;
  return index === 5 || engine.isSolved(state);
}
