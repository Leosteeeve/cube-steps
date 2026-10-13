import type { CubeState } from '../core/types';
import type { CaseFixture } from './types';
export interface FixtureIdentity {
  stateKey: string;
  target?: CaseFixture['target'];
  protectedIds: readonly string[];
}
export function fixtureStateKey(state: CubeState): string {
  return Object.keys(state.data)
    .sort()
    .map((name) => {
      const orbit = state.data[name];
      return (
        name +
        ':' +
        [orbit.pieces, orbit.orientation, orbit.orientationMod ?? []]
          .map((a) => a.map((n) => n.toString(36)).join(','))
          .join('/')
      );
    })
    .join('|');
}
