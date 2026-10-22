import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { EDGE_SLOTS, CORNER_SLOTS } from '../../../core/observations';
import { observeRouxFrame, rouxReferenceState } from '../frame';
import type { BlockGoal } from './types';
export interface BlockCoordinate {
  edge: number;
  corner: number;
  phase: number;
}
export function goalKey(goal: BlockGoal): string {
  return [
    goal.side,
    goal.phase,
    [...goal.targetIds].sort().join(','),
    [...goal.lockedIds].sort().join(','),
  ].join('/');
}
export function readBlockCoordinate(
  engine: CubeEngine,
  state: CubeState,
  goal: BlockGoal,
): BlockCoordinate {
  const read = (orbit: string, slots: string[], id: string | undefined, base: number) => {
    if (!id) return 0;
    const position = state.data[orbit].pieces.indexOf(slots.indexOf(id));
    if (position < 0) throw new Error('Block target is missing.');
    return position * base + state.data[orbit].orientation[position];
  };
  const phase = observeRouxFrame(engine, state).centerPhase;
  if (phase === null) throw new Error('Establish the Roux holding frame first.');
  return {
    edge: read(
      'EDGES',
      EDGE_SLOTS,
      goal.targetIds.find((id) => id.length === 2),
      2,
    ),
    corner: read(
      'CORNERS',
      CORNER_SLOTS,
      goal.targetIds.find((id) => id.length === 3),
      3,
    ),
    phase,
  };
}
export function coordinateIndex(c: BlockCoordinate, goal: BlockGoal): number {
  return (c.edge * (goal.phase === 'pair' ? 24 : 1) + c.corner) * 4 + c.phase;
}
export function coordinateAt(index: number, goal: BlockGoal): BlockCoordinate {
  const width = goal.phase === 'pair' ? 24 : 1;
  return {
    phase: index % 4,
    corner: Math.floor(index / 4) % width,
    edge: Math.floor(index / (4 * width)),
  };
}
export interface BlockTransition {
  edges: number[];
  corners: number[];
  phase: number;
}
export function blockTransition(
  engine: CubeEngine,
  moves: readonly TeachingMove[],
): BlockTransition {
  const moved = engine.apply(engine.solved(), moves);
  const map = (orbit: string, size: number, base: number) =>
    Array.from({ length: size * base }, (_, old) => {
      const dest = moved.data[orbit].pieces.indexOf(Math.floor(old / base));
      return dest * base + (((old % base) + moved.data[orbit].orientation[dest]) % base);
    });
  return {
    edges: map('EDGES', 12, 2),
    corners: map('CORNERS', 8, 3),
    phase: observeRouxFrame(engine, engine.apply(rouxReferenceState(engine), moves)).centerPhase!,
  };
}
export function stepCoordinate(
  c: BlockCoordinate,
  t: BlockTransition,
  goal: BlockGoal,
): BlockCoordinate {
  return {
    edge: t.edges[c.edge],
    corner: goal.phase === 'pair' ? t.corners[c.corner] : 0,
    phase: (c.phase + t.phase) % 4,
  };
}
export function reverseTransition(t: BlockTransition): BlockTransition {
  return {
    edges: t.edges.map((_, i) => t.edges.indexOf(i)),
    corners: t.corners.map((_, i) => t.corners.indexOf(i)),
    phase: (4 - t.phase) % 4,
  };
}
export function admissibleIndices(engine: CubeEngine, goal: BlockGoal): number[] {
  const reference = rouxReferenceState(engine);
  const lockedEdges = goal.lockedIds
    .filter((id) => id.length === 2)
    .map((id) => reference.data.EDGES.pieces.indexOf(EDGE_SLOTS.indexOf(id)));
  const lockedCorners = goal.lockedIds
    .filter((id) => id.length === 3)
    .map((id) => reference.data.CORNERS.pieces.indexOf(CORNER_SLOTS.indexOf(id)));
  const result: number[] = [];
  for (let edge = 0; edge < 24; edge++)
    if (!lockedEdges.includes(Math.floor(edge / 2)))
      for (let corner = 0; corner < (goal.phase === 'pair' ? 24 : 1); corner++)
        if (goal.phase === 'base' || !lockedCorners.includes(Math.floor(corner / 3)))
          for (let phase = 0; phase < 4; phase++)
            result.push(coordinateIndex({ edge, corner, phase }, goal));
  return result;
}
