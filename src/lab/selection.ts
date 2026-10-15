import type { LabRoute } from './types';
import { rankLabRoutes } from './execution/score';
export const labRouteIdentity = (r: LabRoute) =>
  r.boundaries.f2lEnd === r.boundaries.crossStart
    ? r.inputFingerprint + '|objective-already-complete'
    : r.startHold.bottom +
      '|' +
      r.startHold.front +
      '|' +
      r.actions
        .map(
          (a) =>
            `${a.section}:${a.algorithmId ?? a.ruleId}:${a.targets.join(',')}:${a.moves.join(' ')}`,
        )
        .join(';');
function dominates(a: LabRoute, b: LabRoute) {
  if (!a.score.rated || !b.score.rated) return false;
  const av = [a.score.T, a.score.R, a.score.G, a.score.V, a.score.A],
    bv = [b.score.T, b.score.R, b.score.G, b.score.V, b.score.A];
  return av.every((v, i) => v <= bv[i]) && av.some((v, i) => v < bv[i]);
}
/** Recommendation plus up to three meaningful, physically distinct alternatives. */
export function selectLabRoutes(routes: readonly LabRoute[]): LabRoute[] {
  const unique = new Map<string, LabRoute>();
  for (const r of routes) {
    if (
      !r.score.rated ||
      r.modelVersion !== 'lab-execution-v1' ||
      r.score.modelVersion !== r.modelVersion
    )
      continue;
    const key = labRouteIdentity(r),
      old = unique.get(key);
    if (!old || rankLabRoutes(r, old) < 0) unique.set(key, r);
  }
  const sorted = [...unique.values()].sort(rankLabRoutes);
  if (!sorted.length) return [];
  const selected = [sorted[0]];
  for (const r of sorted.slice(1)) {
    if (selected.length === 4) break;
    const distinctHold = selected.every(
      (s) => s.startHold.bottom !== r.startHold.bottom || s.startHold.front !== r.startHold.front,
    );
    const nonDominated = !sorted.some((s) => s !== r && dominates(s, r));
    if (distinctHold || nonDominated) selected.push(r);
  }
  return selected;
}
