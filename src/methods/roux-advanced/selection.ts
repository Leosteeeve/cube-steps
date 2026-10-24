import type { RouxRoute } from '../../roux-lab/types';
import type { FirstBlockEvidence, RouxFrameId } from './types';
export function currentRouxEvidence(
  route: RouxRoute,
  evidence: Partial<Record<RouxFrameId, FirstBlockEvidence>>,
): FirstBlockEvidence {
  const next = evidence[route.frameId],
    prior = route.evidence;
  if (!next || next.status === 'not-explored') return prior;
  if (prior.status === 'not-explored' || next.status === 'proven-minimum') return next;
  if (prior.status === 'proven-minimum') return prior;
  return next.upperBound < prior.upperBound ? next : prior;
}
export function isRouxRecommendationEligible(
  route: RouxRoute,
  evidence: FirstBlockEvidence,
): boolean {
  if (!route.score.rated || evidence.status === 'not-explored') return false;
  const upper = evidence.status === 'proven-minimum' ? evidence.minimum : evidence.upperBound;
  return route.counts.first <= upper + 2;
}
function dominates(a: RouxRoute, b: RouxRoute): boolean {
  if (!a.score.rated || !b.score.rated) return false;
  const aa = [a.score.T, a.score.R, a.score.G, a.score.V, a.score.A],
    bb = [b.score.T, b.score.R, b.score.G, b.score.V, b.score.A];
  return aa.every((v, i) => v <= bb[i]) && aa.some((v, i) => v < bb[i]);
}
export function selectRouxRoutes(
  routes: readonly RouxRoute[],
  evidence: Partial<Record<RouxFrameId, FirstBlockEvidence>>,
  limit: number,
): RouxRoute[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 4)
    throw Error('Invalid Roux route selection limit.');
  const unique = [...new Map(routes.map((r) => [r.id, r])).values()];
  const compare = (a: RouxRoute, b: RouxRoute) =>
    (a.score.rated ? a.score.cost : Infinity) - (b.score.rated ? b.score.cost : Infinity) ||
    a.counts.combined - b.counts.combined ||
    a.id.localeCompare(b.id);
  const eligible = unique.filter((r) =>
    isRouxRecommendationEligible(r, currentRouxEvidence(r, evidence)),
  );
  const frontier = eligible
    .filter((r) => !eligible.some((q) => q !== r && dominates(q, r)))
    .sort(compare);
  const fallback = unique.filter((r) => r.basis === 'baseline-fallback').sort(compare)[0];
  if (!frontier.length) return fallback ? [fallback] : [];
  const selected = frontier.slice(0, limit);
  if (limit > 1 && fallback && !selected.some((r) => r.id === fallback.id)) {
    if (selected.length === limit) selected.pop();
    selected.push(fallback);
  }
  return selected;
}
