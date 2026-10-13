import type { CubeEngine } from '../core/types';
import type { CaseFixture } from './types';
import { getAlgorithmCase } from './registry';
import { recognizeAdvancedF2L } from '../methods/advanced/f2l/recognize';
import { recognizeAdvancedOLL } from '../methods/advanced/recognize-oll';
import { recognizeAdvancedPLL } from '../methods/advanced/recognize-pll';
import { observeF2LPairs } from '../methods/cfop/f2l-cases';
import { fixtureStateKey, type FixtureIdentity } from './fixture-contract';
import index from './data/fixture-index.json';
export const FIXTURE_IDENTITIES = index as Readonly<Record<string, FixtureIdentity>>;
export function verifyCaseFixture(engine: CubeEngine, fixture: CaseFixture): void {
  const c = getAlgorithmCase(fixture.caseId),
    identity = FIXTURE_IDENTITIES[fixture.id];
  if (!c || !c.fixtureIds.includes(fixture.id) || !identity)
    throw new Error('Unknown case fixture.');
  if (
    identity.stateKey !== fixtureStateKey(fixture.initial) ||
    identity.target?.cornerId !== fixture.target?.cornerId ||
    identity.target?.edgeId !== fixture.target?.edgeId ||
    identity.target?.slot !== fixture.target?.slot ||
    identity.protectedIds.join(' ') !== fixture.protectedIds.join(' ')
  )
    throw new Error('Fixture identity does not match its declared state or targets.');
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
  if (
    c.family === 'f2l' &&
    (!fixture.target ||
      recognizeAdvancedF2L(engine, fixture.initial, fixture.target)?.caseId !== c.id)
  )
    throw new Error('Fixture does not match the selected F2L case.');
  if (c.family === 'oll' && recognizeAdvancedOLL(engine, fixture.initial)?.caseId !== c.id)
    throw new Error('Fixture does not match the selected OLL case.');
  if (c.family === 'pll' && recognizeAdvancedPLL(engine, fixture.initial)?.caseId !== c.id)
    throw new Error('Fixture does not match the selected PLL case.');
  const pairs = observeF2LPairs(engine, fixture.initial);
  if (!fixture.protectedIds.every((id) => pairs.some((p) => p.cornerId === id && p.solved)))
    throw new Error('Fixture has an invalid protected pair.');
}
