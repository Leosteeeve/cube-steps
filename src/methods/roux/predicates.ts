import type { CubeEngine, CubeState, PieceObservation } from '../../core/types';
import { observeRouxFrame, rouxReferenceObservation, rouxReferenceState } from './frame';
import type { Quarter } from './types';

const slots = {
  left: ['DL', 'FL', 'BL', 'DFL', 'DBL'],
  right: ['DR', 'FR', 'BR', 'DFR', 'DBR'],
} as const;
const slotKey = (s: string) => [...s].sort().join('');
export function sameRouxPiece(a: PieceObservation, b: PieceObservation): boolean {
  return (
    a.id === b.id &&
    a.slot === b.slot &&
    Object.entries(b.stickers).every(([f, c]) => a.stickers[f as keyof typeof a.stickers] === c)
  );
}
export function blockTargets(engine: CubeEngine, side: 'left' | 'right'): PieceObservation[] {
  const reference = rouxReferenceObservation(engine);
  return [...reference.edges, ...reference.corners].filter((p) =>
    slots[side].some((s) => slotKey(s) === slotKey(p.slot)),
  );
}
export function blockComplete(
  engine: CubeEngine,
  state: CubeState,
  side: 'left' | 'right',
): boolean {
  if (!observeRouxFrame(engine, state).sideFrameValid) return false;
  const actual = engine.observe(state),
    pieces = [...actual.edges, ...actual.corners];
  return blockTargets(engine, side).every((want) => pieces.some((p) => sameRouxPiece(p, want)));
}
export function topCornersOriented(engine: CubeEngine, state: CubeState): boolean {
  return engine
    .observe(state)
    .corners.filter((p) => p.slot.includes('U'))
    .every((p) => p.stickers.U === 'yellow');
}
export function cornerOffset(engine: CubeEngine, state: CubeState): Quarter | null {
  if (!observeRouxFrame(engine, state).sideFrameValid) return null;
  const actual = engine.observe(state).corners.filter((p) => p.slot.includes('U'));
  let reference = rouxReferenceState(engine);
  for (let offset = 0; offset < 4; offset++) {
    const expected = engine.observe(reference).corners.filter((p) => p.slot.includes('U'));
    if (expected.every((want) => actual.some((p) => sameRouxPiece(p, want))))
      return offset as Quarter;
    reference = engine.apply(reference, ['U']);
  }
  return null;
}
export function rouxSolved(engine: CubeEngine, state: CubeState): boolean {
  const frame = observeRouxFrame(engine, state);
  return frame.sideFrameValid && frame.centerPhase === 0 && engine.isSolved(state);
}
