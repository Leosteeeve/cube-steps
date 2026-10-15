import type { CubeEngine, CubeState, TeachingMove } from '../../src/core/types';
import { seededScramble } from './lbl-cases';
import { createLabFrame } from '../../src/lab/frames';
import { fingerprintLabState } from '../../src/lab/input';
import { observeF2LPairs } from '../../src/methods/cfop/f2l-cases';
import type { CrossCandidate } from '../../src/lab/cross';

/** Domain fixture: state already has its cross, independently of input parsing. */
export function labCrossForState(engine: CubeEngine, state: CubeState): CrossCandidate {
  const centers = engine.observe(state).centers;
  const hold = { bottom: centers.D, front: centers.F };
  const frame = createLabFrame(
    engine,
    {
      input: { kind: 'scramble', moves: [] },
      initial: state,
      inputHold: hold,
      fingerprint: fingerprintLabState(state),
    },
    hold,
  );
  const canonicalAfter = frame.toCanonical(state);
  return {
    frame,
    hold,
    moves: [],
    after: state,
    canonicalAfter,
    minimum: 0,
    length: 0,
    solvedPairIds: observeF2LPairs(engine, canonicalAfter)
      .filter((p) => p.solved)
      .map((p) => frame.physicalPieceId(p.cornerId)),
  };
}

/** Physical states with declared white-down holding for rule-level tests. */
export function labFixtureStates(engine: CubeEngine): Record<string, CubeState> {
  const held = engine.apply(engine.solved(), ['z2']);
  const opens: TeachingMove[][] = [
    ['R', 'U', "R'"],
    ["L'", 'U', 'L'],
    ['L', 'U', "L'"],
    ["R'", 'U', 'R'],
  ];
  return {
    solved: held,
    crossComplete: engine.apply(held, opens.flat()),
    partialF2L: engine.apply(held, opens[0]),
    wrongSlot: engine.apply(held, ['R', 'U', "R'", 'U', "L'", "U'", 'L']),
    nonWhite: engine.apply(held, ['x']),
    scrambled: engine.apply(engine.solved(), seededScramble(117)),
  };
}
