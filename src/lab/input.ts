import type { CubeEngine, CubeState, SolveInput } from '../core/types';
import { resolveSolveInput } from '../core/solve-input';
import type { LabInput } from './types';

export function freezeLabValue<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeLabValue(child);
    Object.freeze(value);
  }
  return value;
}

export function fingerprintLabState(state: CubeState): string {
  return (
    'cube-v1:' +
    JSON.stringify(
      Object.keys(state.data)
        .sort()
        .map((name) => {
          const orbit = state.data[name];
          return [name, orbit.pieces, orbit.orientation, orbit.orientationMod ?? []];
        }),
    )
  );
}

export function prepareLabInput(engine: CubeEngine, input: SolveInput): LabInput {
  const snapshot = structuredClone(input);
  const initial = resolveSolveInput(engine, snapshot);
  const centers = engine.observe(initial).centers;
  return freezeLabValue({
    input: snapshot,
    initial,
    inputHold: { bottom: centers.D, front: centers.F },
    fingerprint: fingerprintLabState(initial),
  });
}
