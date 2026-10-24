import type { CubeEngine, CubeObservation, CubeState, Face } from '../../../core/types';
import { rouxReferenceState, rouxReferenceObservation } from '../../roux/frame';
import { sameRouxPiece } from '../../roux/predicates';
import { createRouxFrameMap } from '../frames';
import type { RouxFrame } from '../types';
export interface RouxConnection {
  kind: 'pair' | 'square' | 'line';
  pieceIds: readonly string[];
}
const references = new WeakMap<CubeEngine, readonly CubeObservation[]>();
function orientations(e: CubeEngine): readonly CubeObservation[] {
  const cached = references.get(e);
  if (cached) return cached;
  const q = [rouxReferenceState(e)],
    seen = new Set<string>(),
    result: CubeObservation[] = [];
  for (let head = 0; head < q.length; head++) {
    const observation = e.observe(q[head]),
      key = Object.values(observation.centers).join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(observation);
    for (const m of ['x', 'y'] as const) q.push(e.apply(q[head], [m]));
  }
  references.set(e, result);
  return result;
}
export function observeConnections(
  e: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
): readonly RouxConnection[] {
  const map = createRouxFrameMap(e, frame.id),
    actual = e.observe(map.toCanonical(state));
  const pieces = [...actual.edges, ...actual.corners],
    ref = rouxReferenceObservation(e);
  const bySlot = (slot: string) =>
    [...ref.edges, ...ref.corners].find(
      (p) => [...p.slot].sort().join('') === [...slot].sort().join(''),
    )!.id;
  const templates: [RouxConnection['kind'], string[], boolean][] = [
    ['pair', ['DFL', 'FL'], false],
    ['pair', ['DLB', 'BL'], false],
    ['square', ['DL', 'DFL', 'FL'], false],
    ['square', ['DL', 'DLB', 'BL'], false],
    ['line', ['DFL', 'DL', 'DLB'], false],
    ['line', ['FL', 'BL'], true],
  ];
  return templates.flatMap(([kind, slots, center]) => {
    const ids = slots.map(bySlot);
    const connected = orientations(e).some((o) => {
      if (center) {
        const face = (Object.keys(o.centers) as Face[]).find((f) => o.centers[f] === 'blue')!;
        if (actual.centers[face] !== 'blue') return false;
      }
      const expected = [...o.edges, ...o.corners];
      return ids.every((id) => {
        const p = pieces.find((p) => p.id === id),
          r = expected.find((p) => p.id === id);
        return p && r && sameRouxPiece(p, r);
      });
    });
    return connected ? [{ kind, pieceIds: ids.map(map.toPhysicalId) }] : [];
  });
}
