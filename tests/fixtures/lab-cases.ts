import type { CubeEngine, CubeState, TeachingMove } from '../../src/core/types';
import { seededScramble } from './lbl-cases';

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
