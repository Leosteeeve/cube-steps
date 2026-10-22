import type { CubeEngine, TeachingMove } from '../../core/types';
import { ROUX_CORNER_ALGORITHMS } from '../../methods/roux/corners/catalog';
import { ROUX_LSE_ALGORITHMS } from '../../methods/roux/lse/catalog';
import { rouxReferenceState } from '../../methods/roux/frame';
import { ROUX_BLOCK_MANEUVERS, ROUX_BLOCK_ALGORITHMS } from '../../methods/roux/blocks/catalog';
import type { TeachingAlgorithm } from '../../methods/contracts';
const inverse = (moves: readonly TeachingMove[]) =>
  [...moves]
    .reverse()
    .map((m) =>
      m.endsWith('2') ? m : m.endsWith("'") ? m.slice(0, -1) : m + "'",
    ) as TeachingMove[];
const blocks = Object.fromEntries(
  ROUX_BLOCK_MANEUVERS.map((m) => [
    m.id,
    ROUX_BLOCK_ALGORITHMS[m.id] ??
      ({
        name: `${m.moves[0].startsWith('M') ? 'Middle slice' : 'Reposition'}: ${m.moves[0]}`,
        moves: m.moves,
        precondition:
          'Use this turn when the displayed target needs it and the current protected pieces stay in place. It is a setup, not a universal insertion formula.',
        effect: m.moves[0].startsWith('M')
          ? 'Carry the target through the middle slice; the blue-left and green-right side blocks stay still while the middle centers move.'
          : 'Reposition the highlighted target for the next matched block maneuver.',
      } satisfies TeachingAlgorithm),
  ]),
);
export const ROUX_REFERENCE = Object.entries({
  ...blocks,
  ...ROUX_CORNER_ALGORITHMS,
  ...ROUX_LSE_ALGORITHMS,
}).map(([id, algorithm]) => ({
  id,
  algorithm,
  protection: ROUX_BLOCK_MANEUVERS.find((m) => m.id === id)?.protection,
  exampleState: (engine: CubeEngine) =>
    engine.apply(rouxReferenceState(engine), inverse(algorithm.moves)),
}));
