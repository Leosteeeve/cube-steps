import type { CubeEngine, CubeState } from '../../../core/types';
import { RouxPlanningError, type RouxBudget } from '../budget';
import { blockTargets } from '../predicates';
import type { Quarter, RouxActionDraft, RouxPlanResult, RouxStageId } from '../types';
import { encodeLse, lseIndex } from './coordinates';
import { createLseModel, type LseGoal } from './model';
import { lookupLseStep, lseRank, type LseTables } from './policies';
import { ROUX_LSE_MANEUVERS } from './catalog';
const stages: Record<LseGoal, RouxStageId> = {
  orientation: 'roux-edge-orientation',
  'left-right': 'roux-left-right-edges',
  solved: 'roux-last-four-edges',
};
export function traverseLse(
  engine: CubeEngine,
  initial: CubeState,
  tables: LseTables,
  budget: RouxBudget,
  goal: LseGoal,
): RouxPlanResult {
  const stageId = stages[goal],
    actions: RouxActionDraft[] = [];
  let state = initial;
  try {
    const model = createLseModel(engine),
      protectedIds = [...blockTargets(engine, 'left'), ...blockTargets(engine, 'right')].map(
        (p) => p.id,
      ),
      seen = new Set<number>();
    for (;;) {
      const c = encodeLse(engine, state);
      if (!c)
        throw Error('Complete both blocks and the corner ring before the last-six-edge stage.');
      const step = lookupLseStep(tables, c, goal);
      if (!step) {
        if (!model.goal(c, goal)) throw Error('The LSE policy reported an incorrect goal.');
        break;
      }
      budget.node(stageId);
      const key = lseIndex(c);
      if (seen.has(key))
        throw new RouxPlanningError('loop', stageId, 'The LSE rule graph repeated a state.');
      seen.add(key);
      const m = ROUX_LSE_MANEUVERS.find((m) => m.id === step.maneuverId)!,
        match = m.match(engine, state, goal);
      if (!match) throw Error('The selected LSE maneuver does not match the observed case.');
      const before = state;
      state = engine.apply(state, m.moves);
      const after = encodeLse(engine, state);
      if (
        !after ||
        lseRank(tables, after, goal) !== step.rankAfter ||
        !m.check(engine, before, state, goal)
      )
        throw Error('The LSE maneuver failed its decreasing-rank checkpoint.');
      actions.push({
        kind: m.kind,
        ruleId: m.id,
        caseId: match.caseId,
        targets: match.targets,
        recognition: match.recognition,
        explanation: match.explanation,
        moves: [...m.moves],
        ...(m.algorithmId ? { algorithmId: m.algorithmId } : {}),
        roux: {
          goal,
          protectedIds,
          protection: 'always',
          centerPhaseBefore: c.phase as Quarter,
          centerPhaseAfter: after.phase as Quarter,
          cornerOffsetBefore: c.offset as Quarter,
          cornerOffsetAfter: after.offset as Quarter,
          ...(m.kind === 'algorithm'
            ? {
                temporaryNote:
                  'During a quarter-M turn, the middle-slice reference is in progress. Check edge orientation after the complete maneuver.',
              }
            : {}),
        },
        check: {
          id: m.id,
          description:
            'Both blocks and the cyclic corner order are preserved; the LSE rule is one checkpoint closer.',
          test: (s) => {
            const c = encodeLse(engine, s);
            return (
              !!c && m.check(engine, before, s, goal) && lseRank(tables, c, goal) === step.rankAfter
            );
          },
        },
      });
    }
    return { ok: true, state, actions };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof RouxPlanningError ? error.code : 'verification',
      stageId,
      message: error instanceof Error ? error.message : 'LSE planning failed.',
    };
  }
}
