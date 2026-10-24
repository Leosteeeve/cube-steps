import { freezeLabValue } from '../input';
import { demand } from '../experiments/schema';
import type { LabAttempt, LabComparison, TrialBlock } from '../experiments/types';
import type { TrialAttemptBase } from './types';
export function createComparisonBlocks(c: LabComparison, count = 5): readonly TrialBlock[] {
  demand(
    Number.isSafeInteger(count) && count >= 1 && count <= 100,
    'Choose 1–100 comparison blocks.',
  );
  return freezeLabValue(
    Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      ordinal: i + 1,
      comparisonId: c.id,
      createdAt: new Date().toISOString(),
      intendedOrder: i % 2 ? ('BA' as const) : ('AB' as const),
      slots: [
        { id: crypto.randomUUID(), label: 'A' as const, routeId: c.routeAId },
        { id: crypto.randomUUID(), label: 'B' as const, routeId: c.routeBId },
      ] as TrialBlock['slots'],
    })),
  );
}
export function latestAttempts<A extends TrialAttemptBase>(attempts: readonly A[]) {
  const map = new Map<string, A>();
  for (const a of attempts)
    if (!map.has(a.id) || map.get(a.id)!.revision < a.revision) map.set(a.id, a);
  return [...map.values()];
}
export interface BlockSelection<A extends TrialAttemptBase = LabAttempt> {
  slots: { blockId: string; slotId: string; label: 'A' | 'B'; attempt?: A }[];
  excluded: { attemptId: string; reason: string }[];
  rawCount: number;
}
export function attemptExclusionFor(
  a: TrialAttemptBase,
  endpoint: TrialAttemptBase['endpoint'],
): string | undefined {
  if (a.deletedAt) return 'Deleted';
  if (a.kind !== 'measured') return 'Warmup';
  if (a.outcome !== 'followed')
    return a.outcome === 'interrupted'
      ? 'Interrupted'
      : a.outcome === 'deviated'
        ? 'Deviated'
        : 'Incomplete';
  if (a.interruption) return 'Interrupted';
  if (!a.setupConfirmed || !a.holdConfirmed) return 'Setup not confirmed';
  if (!a.rawMs || !Number.isFinite(a.rawMs) || a.rawMs <= 0) return 'No valid duration';
  if (a.endpoint !== endpoint) return 'Different endpoint';
  if (endpoint === 'roux-blocks' && a.method !== 'roux-advanced') return 'Different method';
  return undefined;
}
export function selectEligibleAttemptsFor<A extends TrialAttemptBase>(
  raw: readonly A[],
  blocks: readonly TrialBlock[],
  endpoint: TrialAttemptBase['endpoint'],
): BlockSelection<A> {
  const attempts = latestAttempts(raw),
    byId = new Map(attempts.map((a) => [a.id, a])),
    reasons = new Map<string, string>(),
    chosen = new Set<string>();
  const scope = [
    'experimentId',
    'comparisonId',
    'blockId',
    'slot',
    'routeId',
    'testerId',
    'timingMethod',
    'endpoint',
    'method',
  ] as const;
  function root(a: A): A | undefined {
    let p = a;
    const seen = new Set([a.id]);
    while (p.retryOf) {
      const previous = byId.get(p.retryOf);
      if (
        !previous ||
        seen.has(previous.id) ||
        scope.some((k) => previous[k] !== a[k]) ||
        previous.createdAt > p.createdAt
      )
        return;
      seen.add(previous.id);
      p = previous;
    }
    return p;
  }
  const slots = blocks.flatMap((b) =>
    b.slots.map((slot) => {
      const members = attempts
        .filter(
          (a) =>
            a.comparisonId === b.comparisonId &&
            a.blockId === b.id &&
            a.slot === slot.id &&
            a.routeId === slot.routeId &&
            a.intendedOrder === b.intendedOrder,
        )
        .sort(
          (a, b) =>
            a.createdAt.localeCompare(b.createdAt) ||
            (a.actualOrder ?? 0) - (b.actualOrder ?? 0) ||
            a.id.localeCompare(b.id),
        );
      const original = members.find((a) => a.kind === 'measured' && !a.retryOf);
      let selected: A | undefined;
      for (const a of members) {
        const why = attemptExclusionFor(a, endpoint),
          first = root(a);
        if (!first) reasons.set(a.id, 'Invalid retry link');
        else if (why) reasons.set(a.id, why);
        else if (!original || first.id !== original.id)
          reasons.set(a.id, 'Unlinked or different-condition retry');
        else if (selected) reasons.set(a.id, 'Slot already filled');
        else {
          selected = a;
          chosen.add(a.id);
        }
      }
      return { blockId: b.id, slotId: slot.id, label: slot.label, attempt: selected };
    }),
  );
  for (const a of attempts)
    if (!chosen.has(a.id) && !reasons.has(a.id))
      reasons.set(a.id, attemptExclusionFor(a, endpoint) ?? 'Unmatched exploratory attempt');
  return {
    slots,
    rawCount: attempts.length,
    excluded: [...reasons].map(([attemptId, reason]) => ({ attemptId, reason })),
  };
}
export const attemptExclusion = (a: LabAttempt) => attemptExclusionFor(a, 'cross-f2l');
export const selectEligibleAttempts = (raw: readonly LabAttempt[], blocks: readonly TrialBlock[]) =>
  selectEligibleAttemptsFor(raw, blocks, 'cross-f2l');
