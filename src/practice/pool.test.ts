import { expect, it } from 'vitest';
import { createPracticePool } from './pool';
import { FIXTURE_IDENTITIES } from '../algorithms/case-validation';
import { ALGORITHM_REGISTRY as registry } from '../algorithms/registry';
it('balances_case_ids_across_bag_boundaries', () => {
  const ids = ['oll-20', 'pll-z', 'f2l-01'];
  for (const random of [() => 0, () => 0.999, () => 0.5]) {
    const p = createPracticePool([...ids, 'oll-20', 'missing'], random),
      results = Array.from({ length: 60 }, () => p.next());
    for (let i = 0; i < results.length; i += 3)
      expect(
        results
          .slice(i, i + 3)
          .map((x) => x?.caseId)
          .sort(),
      ).toEqual([...ids].sort());
    results.forEach((x, i) => {
      expect(registry.cases[x!.caseId].fixtureIds).toContain(x!.fixtureId);
      if (i) expect(x!.caseId).not.toBe(results[i - 1]!.caseId);
    });
  }
});
it('varies_single_case_without_identical_repeat', () => {
  for (const c of Object.values(registry.cases)) {
    const pool = createPracticePool([c.id], () => 0);
    let last = '';
    for (let i = 0; i < 8; i++) {
      const next = pool.next();
      expect(next?.caseId).toBe(c.id);
      const key = FIXTURE_IDENTITIES[next!.fixtureId].stateKey;
      expect(key).not.toBe(last);
      last = key;
    }
  }
  expect(createPracticePool([], Math.random).next()).toBeNull();
});
