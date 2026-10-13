import type { CubeEngine, CubeState, Color, ExecutionMetrics } from '../../../core/types';
import type { ActionInput } from '../../shared/trace';
import { RuleError } from '../../shared/trace';
import { DEFAULT_F2L_LIMITS, type F2LTarget, type F2LLimits } from './types';
import { enumerateF2LPreparations } from './prepare';
import { f2lSignature } from './recognize';
import { ALGORITHM_REGISTRY } from '../../../algorithms/registry';
import { measureF2LExecution, compareExecution, compareText } from './execution';
import { createF2LBudget } from './budget';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
export interface F2LCandidate {
  target: F2LTarget;
  caseId: string;
  variantId: string;
  actions: ActionInput[];
  after: CubeState;
  metrics: ExecutionMetrics;
  frontColor: Color;
}
export function enumerateF2LCandidates(
  engine: CubeEngine,
  state: CubeState,
  target: F2LTarget,
  limits: F2LLimits = DEFAULT_F2L_LIMITS,
): F2LCandidate[] {
  return enumerateWithEngine(
    createF2LBudget(engine, limits.maxSimulations).engine,
    state,
    target,
    limits,
  );
}
const variantsBySignature = new Map<string, (typeof ALGORITHM_REGISTRY.variants)[string][]>();
for (const variant of Object.values(ALGORITHM_REGISTRY.variants))
  if (variant.targetSlot) {
    const list = variantsBySignature.get(variant.startSignature) ?? [];
    list.push(variant);
    variantsBySignature.set(variant.startSignature, list);
  }
export function enumerateWithEngine(
  engine: CubeEngine,
  state: CubeState,
  target: F2LTarget,
  limits: F2LLimits,
): F2LCandidate[] {
  const result: F2LCandidate[] = [];
  const actual = observeF2LPairs(engine, state).find(
    (p) => p.cornerId === target.cornerId && p.edgeId === target.edgeId,
  );
  if (!actual || actual.solved) return result;
  const initialTarget: F2LTarget = {
    cornerId: actual.cornerId,
    edgeId: actual.edgeId,
    slot: actual.slot as F2LTarget['slot'],
  };
  for (const prep of enumerateF2LPreparations(engine, state, initialTarget, limits)) {
    const observed = observeF2LPairs(engine, prep.state).find(
      (p) => p.cornerId === target.cornerId,
    )!;
    const currentTarget = {
      cornerId: observed.cornerId,
      edgeId: observed.edgeId,
      slot: observed.slot as F2LTarget['slot'],
    };
    const signature = f2lSignature(engine, prep.state, currentTarget);
    for (const variant of variantsBySignature.get(signature) ?? []) {
      const after = engine.apply(prep.state, variant.moves);
      if (
        !preservesF2L(engine, state, after) ||
        !observeF2LPairs(engine, after).find((p) => p.cornerId === target.cornerId)!.solved
      )
        continue;
      const o = engine.observe(prep.state),
        corner = o.corners.find((p) => p.id === target.cornerId)!,
        edge = o.edges.find((p) => p.id === target.edgeId)!;
      const actions: ActionInput[] = [
        ...prep.actions,
        {
          kind: 'algorithm',
          ruleId: 'advanced-f2l-insert',
          caseId: variant.caseId,
          algorithmId: variant.id,
          targets: [target.cornerId, target.edgeId],
          recognition: `Corner ${corner.slot} (${Object.entries(corner.stickers)
            .map(([face, color]) => `${face} ${color}`)
            .join(', ')}); edge ${edge.slot} (${Object.entries(edge.stickers)
            .map(([face, color]) => `${face} ${color}`)
            .join(
              ', ',
            )}). These match ${ALGORITHM_REGISTRY.cases[variant.caseId].label} for the ${currentTarget.slot} slot.`,
          explanation: variant.effect,
          moves: [...variant.moves],
          check: {
            id: 'advanced-f2l-pair',
            description:
              'The target pair is complete, and the cross and completed pairs are restored.',
            test: (s) =>
              preservesF2L(engine, state, s) &&
              observeF2LPairs(engine, s).find((p) => p.cornerId === target.cornerId)!.solved,
          },
        },
      ];
      if (result.length >= limits.maxCandidatesPerTarget)
        throw new RuleError('budget', 'advanced-f2l', 'F2L candidate output budget exceeded.');
      result.push({
        target: currentTarget,
        caseId: variant.caseId,
        variantId: variant.id,
        actions,
        after,
        metrics: measureF2LExecution(engine, state, target, actions),
        frontColor: engine.observe(after).centers.F,
      });
    }
  }
  if (!result.length)
    throw new RuleError(
      'unsupported-case',
      'advanced-f2l',
      'No admitted formula matches the prepared target pair.',
    );
  return result;
}
export const candidateMoves = (c: F2LCandidate) => c.actions.flatMap((a) => a.moves).join(' ');
export function compareImmediate(a: F2LCandidate, b: F2LCandidate): number {
  return (
    compareExecution(a.metrics, b.metrics) ||
    compareText(a.target.cornerId, b.target.cornerId) ||
    compareText(a.target.edgeId, b.target.edgeId) ||
    compareText(a.variantId, b.variantId) ||
    compareText(candidateMoves(a), candidateMoves(b))
  );
}
