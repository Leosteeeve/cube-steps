import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { RouxPlanningError, type RouxBudget } from '../budget';
import { observeRouxFrame } from '../frame';
import { blockComplete, blockTargets, cornerOffset, topCornersOriented } from '../predicates';
import type { RouxActionDraft, RouxPlanResult, RouxStageId } from '../types';
import { ROUX_CORNER_ALGORITHMS } from './catalog';
import { cornerOrientationSignature, headlights, recognizeRouxCorners } from './recognize';
function plan(
  engine: CubeEngine,
  initial: CubeState,
  budget: RouxBudget,
  look: 'orientation' | 'permutation',
): RouxPlanResult {
  const stageId: RouxStageId =
    look === 'orientation' ? 'roux-corner-orientation' : 'roux-corner-permutation';
  const actions: RouxActionDraft[] = [];
  let state = initial;
  try {
    if (!blockComplete(engine, state, 'left') || !blockComplete(engine, state, 'right'))
      throw Error('Complete both side blocks before solving the top corners.');
    budget.node(stageId);
    const match = recognizeRouxCorners(engine, state, look);
    const protectedIds = [...blockTargets(engine, 'left'), ...blockTargets(engine, 'right')].map(
      (p) => p.id,
    );
    const emit = (moves: TeachingMove[], purpose: 'setup' | 'formula' | 'align') => {
      if (!moves.length) return;
      budget.node(stageId);
      const before = state,
        observation = engine.observe(state),
        frame = observeRouxFrame(engine, state),
        offset = cornerOffset(engine, state);
      state = engine.apply(state, moves);
      const after = state,
        afterOffset = cornerOffset(engine, state);
      const algorithmId = purpose === 'formula' ? match.algorithmId : undefined;
      const recognition =
        look === 'orientation'
          ? `Yellow corner sticker positions: ${cornerOrientationSignature(engine, before)}. Ignore the edges.`
          : `Matching corner headlights: ${headlights(engine, before).join(', ') || 'none'}. Look at corner stickers only.`;
      const explanation =
        purpose === 'setup'
          ? `Use ${moves.join(' ')} to bring the corner pattern into the formula's execution hold. Both blocks stay in place.`
          : purpose === 'align'
            ? `Use ${moves.join(' ')} to align the solved corner ring with the blue-left and green-right block frame.`
            : `Apply ${ROUX_CORNER_ALGORITHMS[algorithmId!].name} in full. The blocks may look disturbed during the formula; they must return at its endpoint. ${ROUX_CORNER_ALGORITHMS[algorithmId!].effect}`;
      actions.push({
        kind: purpose === 'formula' ? 'algorithm' : 'setup',
        ruleId: algorithmId ?? `roux-corner-${purpose}`,
        caseId: purpose === 'align' ? 'roux-corners-in-order' : match.caseId,
        targets: observation.corners.filter((p) => p.slot.includes('U')).map((p) => p.id),
        moves,
        algorithmId,
        recognition,
        explanation,
        roux: {
          goal: stageId,
          protectedIds,
          protection: purpose === 'formula' ? 'endpoint' : 'always',
          centerPhaseBefore: frame.centerPhase,
          centerPhaseAfter: observeRouxFrame(engine, after).centerPhase!,
          ...(offset === null ? {} : { cornerOffsetBefore: offset }),
          ...(afterOffset === null ? {} : { cornerOffsetAfter: afterOffset }),
          ...(purpose === 'formula'
            ? { temporaryNote: 'Finish the whole corner formula before checking the two blocks.' }
            : {}),
        },
        check: {
          id: `${stageId}-${purpose}`,
          description: 'Both blocks are restored at this corner checkpoint.',
          test: (s) =>
            engine.equals(s, after) &&
            blockComplete(engine, s, 'left') &&
            blockComplete(engine, s, 'right'),
        },
      });
    };
    emit(match.setup, 'setup');
    if (match.algorithmId) emit([...ROUX_CORNER_ALGORITHMS[match.algorithmId].moves], 'formula');
    emit(match.alignment, 'align');
    if (
      !(look === 'orientation'
        ? topCornersOriented(engine, state)
        : cornerOffset(engine, state) === 0) ||
      !blockComplete(engine, state, 'left') ||
      !blockComplete(engine, state, 'right')
    )
      throw Error('The corner stage failed its physical checkpoint.');
    return { ok: true, state, actions };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof RouxPlanningError ? error.code : 'verification',
      stageId,
      message: error instanceof Error ? error.message : 'Roux corner planning failed.',
    };
  }
}
export const planCornerOrientation = (engine: CubeEngine, initial: CubeState, budget: RouxBudget) =>
  plan(engine, initial, budget, 'orientation');
export const planCornerPermutation = (engine: CubeEngine, initial: CubeState, budget: RouxBudget) =>
  plan(engine, initial, budget, 'permutation');
