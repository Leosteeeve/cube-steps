import type { CubeEngine, CubeState } from '../../../core/types';
import type { RouxActionDraft, RouxPlanResult, RouxStageId } from '../types';
import { observeRouxFrame } from '../frame';
import { RouxPlanningError, type RouxBudget } from '../budget';
import { ROUX_BLOCK_MANEUVERS, blockGoalReached, locksCorrect, pieces } from './catalog';
import {
  blockTransition,
  stepCoordinate,
  coordinateIndex,
  goalKey,
  readBlockCoordinate,
} from './coordinates';
import { validateBlockPolicies } from './policies';
import type { BlockGoal, BlockManeuver, BlockMatch, RouxBlockPolicies } from './types';
const width = 8;
const compare = (a: readonly (number | string)[], b: readonly (number | string)[]): number => {
  for (let i = 0; i < a.length; i++) {
    const c =
      typeof a[i] === 'number'
        ? (a[i] as number) - (b[i] as number)
        : String(a[i]).localeCompare(String(b[i]));
    if (c) return c;
  }
  return 0;
};
interface Choice {
  m: BlockManeuver;
  match: BlockMatch;
  before: CubeState;
  after: CubeState;
  rank: number;
}
interface Route {
  state: CubeState;
  steps: Choice[];
  rear: number;
  tokens: number;
  ids: string;
}
export function blockStateKey(engine: CubeEngine, state: CubeState, goal: BlockGoal): string {
  return JSON.stringify([
    goalKey(goal),
    observeRouxFrame(engine, state),
    pieces(engine, state).filter(
      (p) => goal.targetIds.includes(p.id) || goal.lockedIds.includes(p.id),
    ),
  ]);
}
export function planBlockGoal(
  engine: CubeEngine,
  initial: CubeState,
  goal: BlockGoal,
  policies: RouxBlockPolicies,
  budget: RouxBudget,
): RouxPlanResult {
  const stageId: RouxStageId = goal.side === 'left' ? 'roux-first-block' : 'roux-second-block';
  let state = initial;
  const actions: RouxActionDraft[] = [];
  try {
    validateBlockPolicies(policies);
    if (!locksCorrect(engine, state, goal))
      throw new RouxPlanningError(
        'verification',
        stageId,
        'A protected block piece is not in its checkpoint position.',
      );
    const table = policies.tables.find((t) => t.key === goalKey(goal));
    if (!table)
      throw new RouxPlanningError(
        'unsupported-case',
        stageId,
        'No admitted policy matches this block goal.',
      );
    const maneuvers = table.allowed.map((id) => ROUX_BLOCK_MANEUVERS.find((m) => m.id === id)!);
    if (blockGoalReached(engine, state, goal)) return { ok: true, state, actions };
    const startRank = table.rank[coordinateIndex(readBlockCoordinate(engine, state, goal), goal)];
    if (!(startRank > 0))
      throw new RouxPlanningError(
        'verification',
        stageId,
        'The block policy does not describe this legal target state.',
      );
    const maps = maneuvers.map((m) => blockTransition(engine, m.moves));
    let routes: Route[] = [{ state, steps: [], rear: 0, tokens: 0, ids: '' }];
    const nextReadiness = (s: CubeState) => {
      const next = policies.tables.filter(
        (t) =>
          t.goal.side === goal.side &&
          t.goal.phase === 'pair' &&
          !t.goal.targetIds.some((id) => goal.targetIds.includes(id)) &&
          locksCorrect(engine, s, t.goal),
      );
      return next.length
        ? Math.min(
            ...next.map(
              (t) => t.rank[coordinateIndex(readBlockCoordinate(engine, s, t.goal), t.goal)],
            ),
          )
        : 0;
    };
    for (let rank = startRank; rank > 0; rank--) {
      const candidates: Route[] = [];
      for (const route of routes) {
        const coordinate = readBlockCoordinate(engine, route.state, goal);
        for (let i = 0; i < maneuvers.length; i++) {
          budget.node(stageId);
          if (
            table.rank[coordinateIndex(stepCoordinate(coordinate, maps[i], goal), goal)] !==
            rank - 1
          )
            continue;
          const m = maneuvers[i],
            match = m.match(engine, route.state, goal);
          if (!match) continue;
          const after = engine.apply(route.state, m.moves);
          const rear = pieces(engine, route.state).filter(
            (p) => goal.targetIds.includes(p.id) && p.slot.includes('B'),
          ).length;
          candidates.push({
            state: after,
            steps: [...route.steps, { m, match, before: route.state, after, rank }],
            rear: route.rear + rear,
            tokens: route.tokens + m.moves.length,
            ids: route.ids + '/' + m.id,
          });
        }
      }
      // Every retained route reaches the same policy depth; rank strictly decreases.
      const scores = new Map(
        candidates.map((r) => [
          r,
          [
            r.steps.length,
            r.rear,
            rank === 1 ? nextReadiness(r.state) : 0,
            r.tokens +
              (rank === 1
                ? 0
                : table.cost[coordinateIndex(readBlockCoordinate(engine, r.state, goal), goal)]),
            r.ids,
          ],
        ]),
      );
      routes = candidates.sort((a, b) => compare(scores.get(a)!, scores.get(b)!)).slice(0, width);
      if (!routes.length)
        throw new RouxPlanningError(
          'unsupported-case',
          stageId,
          'No explained maneuver advances this block case.',
        );
    }
    const best = routes[0];
    if (!blockGoalReached(engine, best.state, goal))
      throw new RouxPlanningError(
        'verification',
        stageId,
        'Block route did not reach its checkpoint.',
      );
    for (const chosen of best.steps) {
      const { before, rank } = chosen;
      state = chosen.after;
      const phaseBefore = observeRouxFrame(engine, before).centerPhase,
        phaseAfter = observeRouxFrame(engine, state).centerPhase!;
      const { m, match } = chosen;
      actions.push({
        kind: m.kind,
        ruleId: m.id,
        caseId: match.caseId,
        targets: match.targets,
        moves: [...m.moves],
        ...(m.algorithmId ? { algorithmId: m.algorithmId } : {}),
        recognition: match.recognition,
        explanation: match.explanation,
        roux: {
          goal: goalKey(goal),
          protectedIds: [...goal.lockedIds],
          protection: goal.side === 'right' ? 'endpoint' : m.protection,
          centerPhaseBefore: phaseBefore,
          centerPhaseAfter: phaseAfter,
          ...(m.kind === 'algorithm'
            ? {
                temporaryNote:
                  'Finish this open-adjust-close maneuver before checking the protected pieces.',
              }
            : {}),
        },
        check: {
          id: m.id,
          description:
            'The protected pieces are restored and the target is closer to its block checkpoint.',
          test: (s) =>
            m.check(engine, before, s, goal) &&
            table.rank[coordinateIndex(readBlockCoordinate(engine, s, goal), goal)] === rank - 1,
        },
      });
    }
    return { ok: true, state, actions };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof RouxPlanningError ? error.code : 'verification',
      stageId,
      message: error instanceof Error ? error.message : 'Roux block planning failed.',
    };
  }
}
