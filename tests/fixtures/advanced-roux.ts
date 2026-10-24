import type { CubeEngine, CubeState, TeachingMove } from '../../src/core/types';
export const ADVANCED_ROUX_SETUPS = {
  solved: [],
  'slice-phase': ['M'],
  'upper-offset': ['U2'],
  mixed: ['R', 'U', "F'", 'L2', 'D', 'B2', "U'"],
  'square-pair': ['F'],
  'line-line': ['L'],
  'late-base': ['L2', 'M2', 'U', 'M', 'U2', "M'", 'U', 'M2', 'L2'],
} as const satisfies Record<string, readonly TeachingMove[]>;
export function advancedRouxFixture(
  engine: CubeEngine,
  id: keyof typeof ADVANCED_ROUX_SETUPS,
): CubeState {
  return engine.apply(engine.apply(engine.solved(), ['x2', 'y']), ADVANCED_ROUX_SETUPS[id]);
}
