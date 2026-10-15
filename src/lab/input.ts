import type { CubeEngine, CubeState, SolveInput } from '../core/types';
import { resolveSolveInput } from '../core/solve-input';
import { isTeachingMove } from '../core/teaching-moves';
import type { LabInput } from './types';
import { LAB_WORK, meterLabEngine, type LabBudget, type LabWork } from './budget';

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

/** Same input contract with bounded replay batches for worker/client admission. */
export function* prepareLabInputSteps(
  rawEngine: CubeEngine,
  input: SolveInput,
  budget: LabBudget,
): Generator<LabWork, LabInput> {
  const engine = meterLabEngine(rawEngine, budget),
    snapshot = structuredClone(input);
  let initial: CubeState;
  if (snapshot.kind === 'scramble') {
    if (!Array.isArray(snapshot.moves))
      throw Error('The initial scramble contains an unsupported move.');
    initial = engine.solved();
    yield LAB_WORK;
    for (const move of snapshot.moves) {
      if (!isTeachingMove(move) || !/^[UDLRFB](?:'|2)?$/.test(move))
        throw Error('The initial scramble contains an unsupported move.');
      initial = engine.apply(initial, [move]);
      yield LAB_WORK;
    }
  } else {
    initial = resolveSolveInput(engine, snapshot);
    yield LAB_WORK;
  }
  const centers = engine.observe(initial).centers;
  return freezeLabValue({
    input: snapshot,
    initial,
    inputHold: { bottom: centers.D, front: centers.F },
    fingerprint: fingerprintLabState(initial),
  });
}
