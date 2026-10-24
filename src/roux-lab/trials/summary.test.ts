import { expect, it } from 'vitest';
import { createRouxComparisonBlocks, selectEligibleRouxAttempts } from './blocks';
import { summarizeRouxComparison } from './summary';
import type { RouxAttempt, RouxComparison } from '../experiments/types';
const c: RouxComparison = {
  schemaVersion: 1,
  id: 'c',
  experimentId: 'e',
  routeAId: 'a',
  routeBId: 'b',
  createdAt: '2026-10-24T00:00:00.000Z',
};
const blocks = createRouxComparisonBlocks(c, 5);
function attempt(i: number, label: 'A' | 'B', patch: Partial<RouxAttempt> = {}): RouxAttempt {
  const b = blocks[i],
    slot = b.slots.find((s) => s.label === label)!;
  return {
    schemaVersion: 1,
    method: 'roux-advanced',
    id: crypto.randomUUID(),
    revision: 0,
    previousRevision: null,
    createdAt: c.createdAt,
    updatedAt: c.createdAt,
    experimentId: c.experimentId,
    comparisonId: c.id,
    blockId: b.id,
    slot: slot.id,
    routeId: slot.routeId,
    testerId: 't',
    timingMethod: 'keyboard',
    endpoint: 'roux-blocks',
    kind: 'measured',
    outcome: 'followed',
    rawMs:
      label === 'A' ? [1000, 10000, 11000, 12000, 13000][i] : [6000, 12000, 12000, 13000, 20000][i],
    setupConfirmed: true,
    holdConfirmed: true,
    intendedOrder: b.intendedOrder,
    actualOrder: label === b.intendedOrder[0] ? 1 : 2,
    interruption: null,
    deletedAt: null,
    ...patch,
  };
}
const rows = () => blocks.flatMap((_, i) => [attempt(i, 'A'), attempt(i, 'B')]);
it('keeps stable AB/BA blocks and uses median paired B minus A, never difference of medians', () => {
  expect(blocks.map((b) => b.intendedOrder)).toEqual(['AB', 'BA', 'AB', 'BA', 'AB']);
  const all = rows();
  expect(summarizeRouxComparison(c, 't', 'keyboard', blocks, all.slice(0, 8))).toMatchObject({
    status: 'insufficient',
    completeBlocks: 4,
  });
  const s = summarizeRouxComparison(c, 't', 'keyboard', blocks, all);
  expect(s).toMatchObject({
    status: 'ready',
    completeBlocks: 5,
    medianA: 11000,
    medianB: 12000,
    medianDifference: 2000,
  });
  expect(s.ratings.A.flow).toEqual({ count: 0, distribution: [0, 0, 0, 0, 0] });
});
it('excludes other inputs, route versions, testers, methods and endpoints with reasons', () => {
  const all = rows();
  for (const patch of [
    { experimentId: 'another-input' },
    { routeId: 'new-version' },
    { testerId: 'josh' },
    { timingMethod: 'touch' },
    { endpoint: 'cross-f2l' },
    { method: 'cfop-advanced' },
    { kind: 'warmup' },
    { outcome: 'deviated' },
    { deletedAt: c.createdAt },
  ]) {
    const changed = { ...all[0], ...patch } as RouxAttempt;
    const s = summarizeRouxComparison(c, 't', 'keyboard', blocks, [changed, ...all.slice(1)]);
    expect(s.completeBlocks).toBe(4);
    expect(s.exclusions.some((x) => x.attemptId === changed.id)).toBe(true);
  }
});
it('uses an explicit eligible retry once without erasing the invalid original', () => {
  const bad = attempt(0, 'A', { outcome: 'deviated' }),
    retry = attempt(0, 'A', { retryOf: bad.id, createdAt: '2026-10-24T00:00:01.000Z', flow: 5 }),
    later = attempt(0, 'A', { retryOf: retry.id, createdAt: '2026-10-24T00:00:02.000Z' });
  const s = selectEligibleRouxAttempts([bad, retry, later], blocks);
  expect(s.slots[0].attempt?.id).toBe(retry.id);
  expect(s.excluded.map((x) => x.attemptId)).toEqual(expect.arrayContaining([bad.id, later.id]));
});
