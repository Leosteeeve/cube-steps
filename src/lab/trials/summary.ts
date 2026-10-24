import type { LabAttempt, LabComparison, TimingMethod, TrialBlock } from '../experiments/types';
import { latestAttempts, selectEligibleAttemptsFor } from './blocks';
import type { TrialAttemptBase } from './types';
const median = (values: number[]) => {
  const a = values.slice().sort((a, b) => a - b),
    m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const distribution = (attempts: TrialAttemptBase[], key: 'flow' | 'recognition') => {
  const bins = [0, 0, 0, 0, 0];
  for (const a of attempts)
    if (a[key] !== undefined && Number.isInteger(a[key]) && a[key]! >= 1 && a[key]! <= 5)
      bins[a[key]! - 1]++;
  return { count: bins.reduce((a, b) => a + b, 0), distribution: bins };
};
export function summarizeComparisonFor<A extends TrialAttemptBase>(
  c: LabComparison,
  testerId: string,
  method: TimingMethod,
  blocks: readonly TrialBlock[],
  raw: readonly A[],
  endpoint: TrialAttemptBase['endpoint'],
) {
  const attempts = latestAttempts(raw),
    matching = attempts.filter(
      (a) =>
        a.experimentId === c.experimentId &&
        a.comparisonId === c.id &&
        [c.routeAId, c.routeBId].includes(a.routeId) &&
        a.testerId === testerId &&
        a.timingMethod === method &&
        a.endpoint === endpoint &&
        (endpoint !== 'roux-blocks' || a.method === 'roux-advanced'),
    );
  const selection = selectEligibleAttemptsFor(
      matching,
      blocks.filter((b) => b.comparisonId === c.id),
      endpoint,
    ),
    pairs = blocks
      .filter((b) => b.comparisonId === c.id)
      .flatMap((b) => {
        const a = selection.slots.find((s) => s.blockId === b.id && s.label === 'A')?.attempt,
          bb = selection.slots.find((s) => s.blockId === b.id && s.label === 'B')?.attempt;
        return a && bb ? [{ a, b: bb }] : [];
      });
  const selected = new Set(pairs.flatMap((p) => [p.a.id, p.b.id])),
    exclusions = [...selection.excluded];
  for (const a of matching)
    if (!selected.has(a.id) && !exclusions.some((x) => x.attemptId === a.id))
      exclusions.push({ attemptId: a.id, reason: 'Incomplete matched block' });
  for (const a of attempts)
    if (!matching.some((m) => m.id === a.id))
      exclusions.push({
        attemptId: a.id,
        reason: 'Different comparison conditions or exploratory attempt',
      });
  const a = pairs.map((p) => p.a),
    b = pairs.map((p) => p.b),
    ready = pairs.length >= 5;
  return {
    status: ready ? ('ready' as const) : ('insufficient' as const),
    rawCount: attempts.length,
    eligibleCount: selected.size,
    excludedCount: exclusions.length,
    exclusions,
    completeBlocks: pairs.length,
    medianA: ready ? median(a.map((x) => x.rawMs!)) : undefined,
    medianB: ready ? median(b.map((x) => x.rawMs!)) : undefined,
    medianDifference: ready ? median(pairs.map((p) => p.b.rawMs! - p.a.rawMs!)) : undefined,
    ratings: {
      A: { flow: distribution(a, 'flow'), recognition: distribution(a, 'recognition') },
      B: { flow: distribution(b, 'flow'), recognition: distribution(b, 'recognition') },
    },
    selection,
  };
}
export const summarizeComparison = (
  c: LabComparison,
  testerId: string,
  method: TimingMethod,
  blocks: readonly TrialBlock[],
  raw: readonly LabAttempt[],
) => summarizeComparisonFor(c, testerId, method, blocks, raw, 'cross-f2l');
export type ComparisonSummary = ReturnType<typeof summarizeComparison>;
