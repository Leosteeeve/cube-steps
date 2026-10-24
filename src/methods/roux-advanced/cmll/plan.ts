import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { fingerprintLabState } from '../../../lab/input';
import { U_SETUPS } from '../../roux/corners/recognize';
import { createRouxFrameMap } from '../frames';
import { meterRouxEngine } from '../budget';
import { observeAdvancedFrame, blockCompleteInFrame } from '../predicates';
import type { AdvancedRouxActionDraft, RouxFrame, RouxSearchBudget } from '../types';
import type { CmllCatalog } from './types';
import { recognizeCmll } from './recognize';
import { admitCmllCatalog } from './admission';
export function planCmllVariants(
  engine: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
  catalog: CmllCatalog,
  budget: RouxSearchBudget,
): readonly { variantId: string | null; actions: AdvancedRouxActionDraft[]; state: CubeState }[] {
  const e = meterRouxEngine(engine, budget);
  admitCmllCatalog(e, catalog, budget);
  const match = recognizeCmll(e, state, frame, catalog);
  if (!('family' in match)) return [{ variantId: null, actions: [], state }];
  const group = catalog.cases.find((c) => c.id === match.caseId)!,
    map = createRouxFrameMap(e, frame.id),
    result: { variantId: string | null; actions: AdvancedRouxActionDraft[]; state: CubeState }[] =
      [];
  for (const id of group.variantIds.slice(0, 2))
    for (const setup of U_SETUPS) {
      budget.charge('expand');
      const v = catalog.variants[id],
        held = e.apply(state, setup),
        after = e.apply(held, v.moves),
        observed = observeAdvancedFrame(e, after, frame);
      if (
        observed.cornerOffset === null ||
        !blockCompleteInFrame(e, after, frame, 'left') ||
        !blockCompleteInFrame(e, after, frame, 'right')
      )
        continue;
      const locks = v.protectedIds.map(map.toPhysicalId),
        actions: AdvancedRouxActionDraft[] = [];
      const emit = (
        before: CubeState,
        moves: readonly TeachingMove[],
        end: CubeState,
        algorithm: boolean,
      ) => {
        if (!moves.length) return;
        const a = observeAdvancedFrame(e, before, frame),
          b = observeAdvancedFrame(e, end, frame),
          key = fingerprintLabState(end);
        if (b.centerPhase === null) throw Error('CMLL endpoint lost its side frame.');
        actions.push({
          kind: algorithm ? 'algorithm' : 'setup',
          ruleId: algorithm ? id : 'ar-cmll-setup',
          caseId: match.caseId,
          algorithmId: algorithm ? id : undefined,
          targets: [...match.targetIds],
          moves: [...moves],
          recognition: match.recognition,
          explanation: algorithm
            ? `Apply ${v.name} in the shown hold. Read the chunks as one formula; check both blocks only at the end. The ${frame.centers.U} corners are now in cyclic order; the remaining edge state and middle-center phase ${b.centerPhase} are recorded for LSE.`
            : `Use ${moves.join(' ')} to bring the corner pattern into the displayed formula hold. Both blocks remain intact.`,
          rouxAdvanced: {
            frameId: frame.id,
            goal: algorithm
              ? 'Solve the top corners modulo U alignment'
              : 'Set up the recognized CMLL case',
            protectedIds: locks,
            protection: algorithm ? 'endpoint' : 'always',
            centerPhaseBefore: a.centerPhase,
            centerPhaseAfter: b.centerPhase,
            ...(a.cornerOffset !== null ? { cornerOffsetBefore: a.cornerOffset } : {}),
            ...(b.cornerOffset !== null ? { cornerOffsetAfter: b.cornerOffset } : {}),
          },
          check: {
            id: algorithm ? id : 'ar-cmll-setup',
            description: 'The recorded corner pattern and both blocks match the checkpoint.',
            test: (s) => fingerprintLabState(s) === key,
          },
        });
      };
      emit(state, setup, held, false);
      emit(held, v.moves, after, true);
      result.push({ variantId: id, actions, state: after });
    }
  if (!result.length) throw Error('Recognized CMLL case has no verified continuation.');
  return result;
}
