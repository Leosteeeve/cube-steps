import { ALGORITHM_REGISTRY as registry } from '../algorithms/registry';
import { FIXTURE_IDENTITIES } from '../algorithms/case-validation';
export function createPracticePool(caseIds: readonly string[], random: () => number) {
  const ids = Object.keys(registry.cases).filter((id) => caseIds.includes(id));
  let bag: string[] = [],
    lastCase = '',
    lastState = '';
  const index = (length: number) =>
    Math.min(length - 1, Math.floor(Math.max(0, Math.min(0.999999999999, random())) * length));
  return {
    next(): { caseId: string; fixtureId: string } | null {
      if (!ids.length) return null;
      if (!bag.length) {
        bag = [...ids];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = index(i + 1);
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        if (bag.length > 1 && bag[0] === lastCase) {
          const j = bag.findIndex((id) => id !== lastCase);
          [bag[0], bag[j]] = [bag[j], bag[0]];
        }
      }
      const caseId = bag.shift()!,
        fixtures = registry.cases[caseId].fixtureIds;
      const alternatives = fixtures.filter((id) => FIXTURE_IDENTITIES[id].stateKey !== lastState);
      const candidates = alternatives.length ? alternatives : fixtures,
        fixtureId = candidates[index(candidates.length)];
      lastCase = caseId;
      lastState = FIXTURE_IDENTITIES[fixtureId].stateKey;
      return { caseId, fixtureId };
    },
  };
}
