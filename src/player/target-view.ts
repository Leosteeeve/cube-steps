import type { CubeEngine, CubeState, FaceletRef } from '../core/types';
import { FACE_ENTRY_ORDER, FACELET_LAYOUT } from '../core/facelet-layout';
import { CORNER_SLOTS, EDGE_SLOTS } from '../core/observations';

export function targetFacelets(
  engine: CubeEngine,
  state: CubeState,
  ids: readonly string[],
): readonly FaceletRef[] {
  const wanted = new Set(ids),
    observed = engine.observe(state);
  const occupied = new Set(
    [...observed.edges, ...observed.corners].filter((p) => wanted.has(p.id)).map((p) => p.slot),
  );
  return FACE_ENTRY_ORDER.flatMap((face) =>
    FACELET_LAYOUT[face].flatMap((position, index) => {
      if (position.orbit === 'CENTERS') return [];
      const slots = position.orbit === 'EDGES' ? EDGE_SLOTS : CORNER_SLOTS;
      return occupied.has(slots[position.slot]) ? [{ face, index }] : [];
    }),
  );
}
