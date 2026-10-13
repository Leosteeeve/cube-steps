import type { CubeEngine, CubeState, ExecutionMetrics } from '../../../core/types';
import { DEFAULT_F2L_LIMITS, type F2LLimits, type F2LTarget } from './types';
import {
  enumerateWithEngine,
  compareImmediate,
  candidateMoves,
  type F2LCandidate,
} from './candidates';
import { observeF2LPairs } from '../../cfop/f2l-cases';
import { RuleError } from '../../shared/trace';
import { createF2LBudget } from './budget';
import { rankWithNext, zeroExecution, compareExecution, compareText } from './execution';
export function selectF2LShortlist(candidates: readonly F2LCandidate[]): F2LCandidate[] {
  const counts = new Map<string, number>();
  return [...candidates].sort(compareImmediate).filter((c) => {
    const key = c.target.cornerId + '|' + c.target.edgeId + '|' + c.frontColor,
      count = counts.get(key) ?? 0;
    if (count >= 2) return false;
    counts.set(key, count + 1);
    return true;
  });
}
export function chooseF2LCandidate(
  baseEngine: CubeEngine,
  state: CubeState,
  limits: F2LLimits = DEFAULT_F2L_LIMITS,
): F2LCandidate & { nextMetrics: ExecutionMetrics; compared: number } {
  const { engine } = createF2LBudget(baseEngine, limits.maxSimulations);
  const remaining = (s: CubeState) =>
    observeF2LPairs(engine, s).filter((p) => !p.solved) as F2LTarget[];
  const cache = new Map<string, F2LCandidate[]>();
  const enumerate = (s: CubeState, target: F2LTarget) => {
    const key = JSON.stringify([s.data, target.cornerId, target.edgeId]);
    if (!cache.has(key)) {
      try {
        cache.set(key, enumerateWithEngine(engine, s, target, limits));
      } catch (error) {
        if (error instanceof RuleError && error.code === 'unsupported-case') cache.set(key, []);
        else throw error;
      }
    }
    return cache.get(key)!;
  };
  const first = remaining(state).flatMap((t) => selectF2LShortlist(enumerate(state, t)));
  const ranked: (F2LCandidate & { nextMetrics: ExecutionMetrics })[] = [];
  for (const candidate of first) {
    const nextPairs = remaining(candidate.after);
    let nextMetrics: ExecutionMetrics | undefined = nextPairs.length ? undefined : zeroExecution();
    for (const next of nextPairs)
      for (const c of enumerate(candidate.after, next))
        if (!nextMetrics || compareExecution(c.metrics, nextMetrics) < 0) nextMetrics = c.metrics;
    if (nextMetrics) ranked.push({ ...candidate, nextMetrics });
  }
  ranked.sort((a, b) => {
    const ar = rankWithNext(a.metrics, a.nextMetrics),
      br = rankWithNext(b.metrics, b.nextMetrics);
    for (let i = 0; i < ar.length; i++) if (ar[i] !== br[i]) return ar[i] - br[i];
    return (
      compareText(a.target.cornerId, b.target.cornerId) ||
      compareText(a.target.edgeId, b.target.edgeId) ||
      compareText(a.variantId, b.variantId) ||
      compareText(candidateMoves(a), candidateMoves(b))
    );
  });
  if (!ranked.length)
    throw new RuleError(
      'unsupported-case',
      'advanced-f2l',
      'No verified F2L pair has a valid continuation.',
    );
  return { ...ranked[0], compared: first.length };
}
