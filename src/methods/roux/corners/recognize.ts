import type { CubeEngine, CubeState, Face, TeachingMove } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { rouxReferenceState } from '../frame';
import { cornerOffset, topCornersOriented } from '../predicates';
import { ROUX_CORNER_ALGORITHMS } from './catalog';
export const U_SETUPS: readonly TeachingMove[][] = [[], ['U'], ['U2'], ["U'"]];
export interface RouxCornerMatch {
  caseId: string;
  setup: TeachingMove[];
  algorithmId?: string;
  alignment: TeachingMove[];
}
export function cornerOrientationSignature(engine: CubeEngine, state: CubeState): string {
  return engine
    .observe(state)
    .corners.filter((p) => p.slot.includes('U'))
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map(
      (p) => p.slot + ':' + Object.entries(p.stickers).find(([, color]) => color === 'yellow')?.[0],
    )
    .join('|');
}
export function headlights(engine: CubeEngine, state: CubeState): Face[] {
  const corners = engine.observe(state).corners.filter((p) => p.slot.includes('U'));
  return (['F', 'R', 'B', 'L'] as Face[]).filter((face) => {
    const sides = corners.filter((p) => p.slot.includes(face)).map((p) => p.stickers[face]);
    return sides.length === 2 && sides[0] === sides[1];
  });
}
const patterns = new WeakMap<CubeEngine, Map<string, string>>();
function orientationPatterns(engine: CubeEngine) {
  let table = patterns.get(engine);
  if (table) return table;
  table = new Map();
  for (const [id, a] of Object.entries(ROUX_CORNER_ALGORITHMS))
    if (id.includes('ocll'))
      table.set(
        cornerOrientationSignature(
          engine,
          engine.apply(rouxReferenceState(engine), invertTeachingMoves(a.moves)),
        ),
        id,
      );
  patterns.set(engine, table);
  return table;
}
export function recognizeRouxCorners(
  engine: CubeEngine,
  state: CubeState,
  look: 'orientation' | 'permutation',
): RouxCornerMatch {
  if (look === 'orientation') {
    if (topCornersOriented(engine, state))
      return { caseId: 'roux-corners-oriented', setup: [], alignment: [] };
    for (const setup of U_SETUPS) {
      const held = engine.apply(state, setup),
        algorithmId = orientationPatterns(engine).get(cornerOrientationSignature(engine, held));
      if (algorithmId)
        return { caseId: algorithmId, setup: [...setup], algorithmId, alignment: [] };
    }
  } else {
    if (!topCornersOriented(engine, state))
      throw Error('Orient the yellow corner stickers before positioning corners.');
    const offset = cornerOffset(engine, state);
    if (offset !== null)
      return {
        caseId: 'roux-corners-in-order',
        setup: [],
        alignment: [...U_SETUPS[(4 - offset) % 4]],
      };
    const algorithmId = headlights(engine, state).length ? 'roux-t' : 'roux-y';
    for (const setup of U_SETUPS) {
      const held = engine.apply(state, setup);
      if (algorithmId === 'roux-t' && !headlights(engine, held).includes('L')) continue;
      const result = engine.apply(held, ROUX_CORNER_ALGORITHMS[algorithmId].moves),
        after = cornerOffset(engine, result);
      if (after !== null)
        return {
          caseId: algorithmId,
          setup: [...setup],
          algorithmId,
          alignment: [...U_SETUPS[(4 - after) % 4]],
        };
    }
  }
  throw Error('No taught Roux corner case matches this state.');
}
