import type { CubeEngine, CubeState } from '../../core/types';
import { ROUX_INITIAL_HOLD, observeRouxFrame } from './frame';
import type { RouxActionDraft } from './types';
export function rouxHoldingAction(engine: CubeEngine, state: CubeState): RouxActionDraft {
  const o = engine.observe(state),
    after = engine.apply(state, ROUX_INITIAL_HOLD),
    frame = observeRouxFrame(engine, after);
  if (!frame.sideFrameValid || frame.centerPhase === null)
    throw Error('The input does not match the supported Roux starting hold.');
  return {
    kind: 'regrip',
    ruleId: 'roux-starting-hold',
    caseId: 'input-to-roux',
    targets: [],
    moves: [...ROUX_INITIAL_HOLD],
    recognition: `The input has ${o.centers.U} up and ${o.centers.F} front.`,
    explanation:
      'Rotate the whole cube with x2, then y. Keep blue left, green right and red front. White belongs on the bottom of the two blocks. Later M turns may move the middle centers; changing the camera does not turn the physical cube.',
    roux: {
      goal: 'roux-frame',
      protectedIds: [],
      protection: 'endpoint',
      centerPhaseBefore: observeRouxFrame(engine, state).centerPhase,
      centerPhaseAfter: frame.centerPhase,
    },
    check: {
      id: 'roux-hold',
      description: 'Blue is left and green is right in the fixed Roux frame.',
      test: (s) => engine.equals(s, after) && observeRouxFrame(engine, s).sideFrameValid,
    },
  };
}
