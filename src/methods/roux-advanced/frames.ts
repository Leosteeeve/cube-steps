import type { Color, CubeEngine, Face, TeachingMove } from '../../core/types';
import { COLORS, CENTER_SLOTS } from '../../core/observations';
import { createColorRelabeler } from '../../core/color-relabel';
import type { RouxFrame, RouxFrameId, RouxFrameMap } from './types';
// Enumerate the proper rotation group restricted to white/yellow down. These
// reference transforms preserve handedness; no reflection/color swaps occur.
const frames: RouxFrame[] = [];
for (const flipped of [true, false]) {
  let centers: Record<Face, Color> = flipped
    ? { ...COLORS, U: COLORS.D, D: COLORS.U, F: COLORS.B, B: COLORS.F }
    : { ...COLORS };
  for (let y = 0; y < 4; y++) {
    const positioningMoves: TeachingMove[] = [...(flipped ? ['x2' as const] : [])];
    if (y) positioningMoves.push((y === 1 ? 'y' : y === 2 ? 'y2' : "y'") as TeachingMove);
    frames.push(
      Object.freeze({
        id: `${centers.D}-${centers.L}` as RouxFrameId,
        bottom: centers.D,
        left: centers.L,
        centers: Object.freeze({ ...centers }),
        positioningMoves: Object.freeze(positioningMoves),
      }),
    );
    centers = { ...centers, F: centers.R, R: centers.B, B: centers.L, L: centers.F };
  }
}
export const ROUX_FRAMES: readonly RouxFrame[] = Object.freeze(frames);
export function selectRouxFrames(allowed: readonly string[]): readonly RouxFrame[] {
  if (!allowed.length) throw Error('Choose at least one Roux frame.');
  if (new Set(allowed).size !== allowed.length) throw Error('Duplicate Roux frame.');
  return allowed.map((id) => {
    const frame = ROUX_FRAMES.find((frame) => frame.id === id);
    if (!frame) throw Error('Unknown Roux frame.');
    return frame;
  });
}
const maps = new WeakMap<CubeEngine, Map<RouxFrameId, RouxFrameMap>>();
export function createRouxFrameMap(engine: CubeEngine, frameId: RouxFrameId): RouxFrameMap {
  let saved = maps.get(engine);
  if (!saved) {
    saved = new Map();
    maps.set(engine, saved);
  }
  const prior = saved.get(frameId);
  if (prior) return prior;
  const frame = ROUX_FRAMES.find((f) => f.id === frameId);
  if (!frame) throw Error('Unknown Roux frame.');
  const physical = engine.observe(engine.apply(engine.solved(), frame.positioningMoves)).centers;
  const canonical = engine.observe(engine.apply(engine.solved(), ['x2', 'y'])).centers;
  const colors = Object.fromEntries(
    CENTER_SLOTS.map((face) => [physical[face], canonical[face]]),
  ) as Record<Color, Color>;
  const inverse = Object.fromEntries(Object.entries(colors).map(([a, b]) => [b, a])) as Record<
    Color,
    Color
  >;
  const forward = createColorRelabeler(colors),
    reverse = createColorRelabeler(inverse);
  const map: RouxFrameMap = Object.freeze({
    frame,
    toCanonical: forward.state,
    fromCanonical: reverse.state,
    toCanonicalMoves: (m: readonly TeachingMove[]) => [...m],
    toPhysicalMoves: (m: readonly TeachingMove[]) => [...m],
    toPhysicalId: reverse.id,
  });
  saved.set(frameId, map);
  return map;
}
