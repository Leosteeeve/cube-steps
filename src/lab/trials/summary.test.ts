import { expect, it } from 'vitest';
import { createComparisonBlocks, selectEligibleAttempts } from './blocks';
import { summarizeComparison } from './summary';
import type { LabAttempt, LabComparison } from '../experiments/types';
const c: LabComparison = {
  schemaVersion: 1,
  id: 'c',
  experimentId: 'e',
  routeAId: 'a',
  routeBId: 'b',
  createdAt: '2026-10-14T00:00:00.000Z',
};
const blocks = createComparisonBlocks(c, 5);
function attempt(block: number, label: 'A' | 'B', patch: Partial<LabAttempt> = {}): LabAttempt {
  const b = blocks[block],
    s = b.slots.find((s) => s.label === label)!;
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    revision: 0,
    previousRevision: null,
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
    experimentId: 'e',
    comparisonId: 'c',
    blockId: b.id,
    slot: s.id,
    routeId: s.routeId,
    testerId: 't',
    timingMethod: 'keyboard',
    endpoint: 'cross-f2l',
    kind: 'measured',
    outcome: 'followed',
    rawMs: label === 'A' ? 10000 : 12000,
    setupConfirmed: true,
    holdConfirmed: true,
    intendedOrder: b.intendedOrder,
    actualOrder: label === 'A' ? 1 : 2,
    interruption: null,
    deletedAt: null,
    ...patch,
  };
}
it('persists stable alternating block slots and requires five complete matched blocks', () => {
  expect(blocks.map((b) => b.intendedOrder)).toEqual(['AB', 'BA', 'AB', 'BA', 'AB']);
  expect(blocks.map((b) => b.ordinal)).toEqual([1, 2, 3, 4, 5]);
  expect(new Set(blocks.flatMap((b) => b.slots.map((s) => s.id))).size).toBe(10);
  const attempts = blocks.flatMap((_, i) => [attempt(i, 'A'), attempt(i, 'B')]);
  expect(summarizeComparison(c, 't', 'keyboard', blocks, attempts.slice(0, 8))).toMatchObject({
    status: 'insufficient',
    completeBlocks: 4,
  });
  const summary = summarizeComparison(c, 't', 'keyboard', blocks, attempts);
  expect(summary).toMatchObject({
    status: 'ready',
    completeBlocks: 5,
    medianA: 10000,
    medianB: 12000,
    medianDifference: 2000,
  });
  expect(summary.ratings.A.flow.count).toBe(0);
  expect(summary.ratings.A.flow.distribution).toEqual([0, 0, 0, 0, 0]);
});
it('uses the first eligible linked retry once and preserves invalid originals and duplicates', () => {
  const bad = attempt(0, 'A', { outcome: 'deviated' }),
    retry = attempt(0, 'A', {
      retryOf: bad.id,
      createdAt: '2026-10-14T00:00:01.000Z',
      updatedAt: '2026-10-14T00:00:01.000Z',
      flow: 4,
    });
  const later = attempt(0, 'A', {
      retryOf: bad.id,
      createdAt: '2026-10-14T00:00:02.000Z',
      updatedAt: '2026-10-14T00:00:02.000Z',
    }),
    unlinked = attempt(0, 'A', { actualOrder: 4 });
  const selected = selectEligibleAttempts([bad, retry, later, unlinked, attempt(0, 'B')], blocks);
  expect(
    selectEligibleAttempts([unlinked, later, retry, bad], blocks).slots.find(
      (s) => s.slotId === bad.slot,
    )?.attempt?.id,
  ).toBe(retry.id);
  expect(selected.slots.find((s) => s.slotId === bad.slot)?.attempt?.id).toBe(retry.id);
  expect(selected.excluded.map((x) => x.attemptId)).toEqual(
    expect.arrayContaining([bad.id, later.id, unlinked.id]),
  );
});
it('does not pool testers, methods, routes, warmups, revisions, interruptions or missing ratings', () => {
  const attempts = blocks.flatMap((_, i) => [attempt(i, 'A'), attempt(i, 'B')]);
  for (const patch of [
    { testerId: 'other' },
    { timingMethod: 'touch' },
    { routeId: 'another-version' },
    { kind: 'warmup' },
    { outcome: 'deviated' },
    { outcome: 'interrupted', interruption: 'blur' },
    { deletedAt: '2026-10-14T01:00:00.000Z' },
  ] as Partial<LabAttempt>[]) {
    const changed = [...attempts.slice(1), { ...attempts[0], ...patch }];
    expect(summarizeComparison(c, 't', 'keyboard', blocks, changed).status).toBe('insufficient');
  }
  const revised = {
    ...attempts[0],
    revision: 1,
    previousRevision: 0,
    deletedAt: '2026-10-14T01:00:00.000Z',
  };
  expect(
    summarizeComparison(c, 't', 'keyboard', blocks, [...attempts, revised]).completeBlocks,
  ).toBe(4);
  const rated = attempts.map((a, i) => (i === 0 ? { ...a, flow: 5 } : a));
  expect(summarizeComparison(c, 't', 'keyboard', blocks, rated).ratings.A.flow).toEqual({
    count: 1,
    distribution: [0, 0, 0, 0, 1],
  });
});
it('excludes cross-slot/condition retries, cycles and unmatched exploration', () => {
  const bad = attempt(0, 'A', { outcome: 'incomplete' }),
    wrong = attempt(1, 'A', { retryOf: bad.id }),
    other = attempt(0, 'A', { retryOf: bad.id, testerId: 'other' }),
    cycle = attempt(2, 'A');
  cycle.retryOf = cycle.id;
  const exploratory = attempt(3, 'A');
  delete exploratory.blockId;
  delete exploratory.slot;
  delete exploratory.comparisonId;
  delete exploratory.intendedOrder;
  delete exploratory.actualOrder;
  const selected = selectEligibleAttempts([bad, wrong, other, cycle, exploratory], blocks);
  expect(selected.slots.every((s) => !s.attempt)).toBe(true);
  expect(selected.excluded).toHaveLength(5);
});
