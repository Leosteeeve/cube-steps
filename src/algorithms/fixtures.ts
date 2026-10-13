import type { CubeEngine } from '../core/types';
import type { CaseFixture } from './types';
import { CASE_FIXTURES } from './data/fixtures';
import { getAlgorithmCase } from './registry';
import { recognizeAdvancedF2L } from '../methods/advanced/f2l/recognize';
import { observeF2LPairs } from '../methods/cfop/f2l-cases';
export function getCaseFixture(id: string): CaseFixture | undefined {
  return CASE_FIXTURES[id];
}
export function verifyCaseFixture(engine: CubeEngine, fixture: CaseFixture): void {
  const c = getAlgorithmCase(fixture.caseId);
  if (!c || !c.fixtureIds.includes(fixture.id)) throw new Error('Unknown case fixture.');
  if (
    !fixture.setup.every((m) => /^[UDLRFB](?:2|')?$/.test(m)) ||
    !fixture.holdingMoves.every((m) => /^[xyz](?:2|')?$/.test(m))
  )
    throw new Error('Fixture setup must use face turns followed by explicit holding rotations.');
  if (
    !engine.equals(
      engine.apply(engine.solved(), [...fixture.setup, ...fixture.holdingMoves]),
      fixture.initial,
    )
  )
    throw new Error('Physical setup does not reach the declared fixture state.');
  if (c.family === 'f2l') {
    if (
      !fixture.target ||
      recognizeAdvancedF2L(engine, fixture.initial, fixture.target)?.caseId !== c.id
    )
      throw new Error('Fixture does not match the selected F2L case.');
    const pairs = observeF2LPairs(engine, fixture.initial);
    if (!fixture.protectedIds.every((id) => pairs.some((p) => p.cornerId === id && p.solved)))
      throw new Error('Fixture does not preserve its declared completed pairs.');
  }
}
