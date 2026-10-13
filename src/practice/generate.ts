import type { CubeEngine } from '../core/types';
import type { PracticeRequest } from '../workers/practice-protocol';
import type { PracticeExercise } from './types';
import { getAlgorithmCase, getAlgorithmVariant } from '../algorithms/registry';
import { getCaseFixture } from '../algorithms/fixtures';
import { createDemonstration, verifyDemonstration } from '../algorithms/demonstration';
export function generatePracticeExercise(
  engine: CubeEngine,
  request: PracticeRequest,
): PracticeExercise {
  const { caseId, fixtureId, variantId } = request,
    c = getAlgorithmCase(caseId),
    variant = getAlgorithmVariant(variantId),
    fixture = getCaseFixture(fixtureId);
  if (
    !c ||
    !Object.hasOwn(c, 'fixtureIds') ||
    !c.fixtureIds.includes(fixtureId) ||
    !c.variantIds.includes(variantId) ||
    variant?.caseId !== caseId ||
    fixture?.caseId !== caseId
  )
    throw new Error('Choose a published case, setup and formula from the same case.');
  const demonstration = createDemonstration(engine, fixture, variantId);
  verifyDemonstration(engine, demonstration);
  return { caseId, fixtureId, variantId, demonstration };
}
