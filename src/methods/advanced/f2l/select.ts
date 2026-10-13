import type { CubeEngine, CubeState } from '../../../core/types';
import { DEFAULT_F2L_LIMITS, type F2LLimits, type F2LTarget } from './types';
import {
  enumerateWithBudget,
  compareImmediate,
  candidateMoves,
  type F2LCandidate,
} from './candidates';
import { observeF2LPairs } from '../../cfop/f2l-cases';
import { RuleError } from '../../shared/trace';
import { countTeachingMoves } from '../../../core/move-metrics';
export function chooseF2LCandidate(
  engine: CubeEngine,
  state: CubeState,
  limits: F2LLimits = DEFAULT_F2L_LIMITS,
): F2LCandidate & { nextCost: number; compared: number } {
  const budget = { used: 0, limit: limits.maxSimulations };
  const remaining = (s: CubeState) =>
    observeF2LPairs(engine, s).filter((p) => !p.solved) as F2LTarget[];
  const first = remaining(state).flatMap((target) =>
    enumerateWithBudget(engine, state, target, limits, budget).sort(compareImmediate).slice(0, 8),
  );
  const compared = first.length,
    ranked: (F2LCandidate & { nextCost: number; rotations: number })[] = [];
  // One shared counter includes every first and next-pair simulation. No recursive search.
  for (const candidate of first) {
    const nextPairs = remaining(candidate.after);
    let nextCost = nextPairs.length ? Infinity : 0;
    for (const next of nextPairs) {
      try {
        for (const c of enumerateWithBudget(engine, candidate.after, next, limits, budget))
          nextCost = Math.min(nextCost, c.immediateCost);
      } catch (error) {
        if (!(error instanceof RuleError) || error.code !== 'unsupported-case') throw error;
      }
    }
    if (!Number.isFinite(nextCost)) continue;
    ranked.push({
      ...candidate,
      nextCost,
      rotations: countTeachingMoves(candidate.actions.flatMap((a) => a.moves)).rotations,
    });
  }
  ranked.sort(
    (a, b) =>
      a.immediateCost + 0.5 * a.nextCost - (b.immediateCost + 0.5 * b.nextCost) ||
      a.immediateCost - b.immediateCost ||
      a.rotations - b.rotations ||
      a.target.cornerId.localeCompare(b.target.cornerId) ||
      a.variantId.localeCompare(b.variantId) ||
      candidateMoves(a).localeCompare(candidateMoves(b)),
  );
  if (!ranked.length)
    throw new RuleError(
      'unsupported-case',
      'advanced-f2l',
      'No verified F2L pair has a valid continuation.',
    );
  const { rotations: _, ...chosen } = ranked[0];
  return { ...chosen, compared };
}
