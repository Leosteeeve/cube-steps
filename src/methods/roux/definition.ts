import type { CubeEngine, TraceAction } from '../../core/types';
import type { MethodRuntime } from '../contracts';
import { ROUX_PRESENTATION } from './presentation';
import { checkRouxStage } from './stages';
import { observeRouxFrame } from './frame';
import { blockComplete, blockTargets, sameRouxPiece } from './predicates';
import { rouxHoldingAction } from './holding';
import { createRouxBudget } from './budget';
import { blockGoals, generateBlockPolicies } from './blocks/policies';
import { ROUX_BLOCK_MANEUVERS, blockGoalReached } from './blocks/catalog';
import { coordinateIndex, readBlockCoordinate, goalKey } from './blocks/coordinates';
import { planCornerOrientation, planCornerPermutation } from './corners/plan';
import { encodeLse } from './lse/coordinates';
import { generateLsePolicies, lookupLseStep, lseRank } from './lse/policies';
import { ROUX_LSE_MANEUVERS } from './lse/catalog';
import type { LseGoal } from './lse/model';
import type { RouxAssets } from './assets';
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fields = [
  'kind',
  'ruleId',
  'caseId',
  'targets',
  'recognition',
  'explanation',
  'moves',
  'algorithmId',
  'roux',
] as const;
function sameDraft(action: TraceAction, draft: object): boolean {
  return fields.every((key) => equal(action[key], (draft as Record<string, unknown>)[key]));
}
// The standalone verifier derives finite policies once. Production solves reuse
// the integrity-checked assets through createRouxRuntime.
const blockCache = new WeakMap<CubeEngine, RouxAssets['blockPolicies']>(),
  lseCache = new WeakMap<CubeEngine, RouxAssets['lse']>();
export function createRouxRuntime(assets?: RouxAssets): MethodRuntime {
  return {
    presentation: ROUX_PRESENTATION,
    checkStage: checkRouxStage,
    checkAction(engine, action, stage) {
      try {
        const meta = action.roux;
        if (
          !meta ||
          action.pair ||
          action.cross ||
          action.selection ||
          !engine.equals(engine.apply(action.before, action.moves), action.after)
        )
          return false;
        if (
          meta.centerPhaseBefore !== observeRouxFrame(engine, action.before).centerPhase ||
          meta.centerPhaseAfter !== observeRouxFrame(engine, action.after).centerPhase
        )
          return false;
        if (stage === 'roux-frame')
          return sameDraft(action, rouxHoldingAction(engine, action.before));
        if (stage === 'roux-first-block' || stage === 'roux-second-block') {
          const goal = blockGoals(engine).find((g) => goalKey(g) === meta.goal),
            side = stage === 'roux-first-block' ? 'left' : 'right';
          if (!goal || goal.side !== side || blockGoalReached(engine, action.before, goal))
            return false;
          let policies = assets?.blockPolicies ?? blockCache.get(engine);
          if (!policies) {
            policies = generateBlockPolicies(engine);
            blockCache.set(engine, policies);
          }
          const table = policies.tables.find((t) => t.key === meta.goal)!,
            m = ROUX_BLOCK_MANEUVERS.find((m) => m.id === action.ruleId);
          if (!m || !table.allowed.includes(m.id)) return false;
          const match = m.match(engine, action.before, goal);
          if (!match || !m.check(engine, action.before, action.after, goal)) return false;
          const before =
              table.rank[coordinateIndex(readBlockCoordinate(engine, action.before, goal), goal)],
            after =
              table.rank[coordinateIndex(readBlockCoordinate(engine, action.after, goal), goal)];
          if (before <= 0 || after !== before - 1) return false;
          if (side === 'right') {
            let cursor = action.before;
            for (const move of action.moves) {
              cursor = engine.apply(cursor, [move]);
              if (!blockComplete(engine, cursor, 'left')) return false;
            }
          }
          const expectedMeta = {
            goal: goalKey(goal),
            protectedIds: [...goal.lockedIds],
            protection: goal.side === 'right' ? 'endpoint' : m.protection,
            centerPhaseBefore: observeRouxFrame(engine, action.before).centerPhase,
            centerPhaseAfter: observeRouxFrame(engine, action.after).centerPhase,
            ...(m.kind === 'algorithm'
              ? {
                  temporaryNote:
                    'Finish this open-adjust-close maneuver before checking the protected pieces.',
                }
              : {}),
          };
          return sameDraft(action, {
            kind: m.kind,
            ruleId: m.id,
            ...match,
            moves: m.moves,
            algorithmId: m.algorithmId,
            roux: expectedMeta,
          });
        }
        if (stage === 'roux-corner-orientation' || stage === 'roux-corner-permutation') {
          const result = (
            stage === 'roux-corner-orientation' ? planCornerOrientation : planCornerPermutation
          )(engine, action.before, createRouxBudget());
          return result.ok && result.actions.length > 0 && sameDraft(action, result.actions[0]);
        }
        const goals: Record<string, LseGoal> = {
            'roux-edge-orientation': 'orientation',
            'roux-left-right-edges': 'left-right',
            'roux-last-four-edges': 'solved',
          },
          goal = goals[stage];
        if (!goal) return false;
        const before = encodeLse(engine, action.before),
          after = encodeLse(engine, action.after);
        if (!before || !after) return false;
        let tables = assets?.lse ?? lseCache.get(engine);
        if (!tables) {
          tables = generateLsePolicies(engine);
          lseCache.set(engine, tables);
        }
        const step = lookupLseStep(tables, before, goal),
          m = ROUX_LSE_MANEUVERS.find((m) => m.id === action.ruleId);
        if (
          !step ||
          !m ||
          step.maneuverId !== m.id ||
          lseRank(tables, after, goal) !== step.rankAfter
        )
          return false;
        const match = m.match(engine, action.before, goal);
        if (!match || !m.check(engine, action.before, action.after, goal)) return false;
        const protectedIds = [
          ...blockTargets(engine, 'left'),
          ...blockTargets(engine, 'right'),
        ].map((p) => p.id);
        const expectedMeta = {
          goal,
          protectedIds,
          protection: 'always',
          centerPhaseBefore: before.phase,
          centerPhaseAfter: after.phase,
          cornerOffsetBefore: before.offset,
          cornerOffsetAfter: after.offset,
          ...(m.kind === 'algorithm'
            ? {
                temporaryNote:
                  'During a quarter-M turn, the middle-slice reference is in progress. Check edge orientation after the complete maneuver.',
              }
            : {}),
        };
        let cursor = action.before;
        const original = engine.observe(cursor),
          protectedPieces = [...original.edges, ...original.corners].filter((p) =>
            protectedIds.includes(p.id),
          );
        for (const move of action.moves) {
          cursor = engine.apply(cursor, [move]);
          const o = engine.observe(cursor);
          if (
            !protectedPieces.every((p) =>
              [...o.edges, ...o.corners].some((q) => sameRouxPiece(q, p)),
            )
          )
            return false;
        }
        return sameDraft(action, {
          kind: m.kind,
          ruleId: m.id,
          ...match,
          moves: m.moves,
          algorithmId: m.algorithmId,
          roux: expectedMeta,
        });
      } catch {
        return false;
      }
    },
  };
}
export const ROUX_RUNTIME = createRouxRuntime();
