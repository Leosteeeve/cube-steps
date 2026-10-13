import { ensureAdvancedHolding, type AdvancedContext } from '../context';
import type { StageResult } from '../../contracts';
import { chooseF2LCandidate } from './select';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
import { RuleError } from '../../shared/trace';
export function solveAdvancedF2L(context: AdvancedContext): StageResult {
  const { engine, trace } = context;
  if (observeF2LPairs(engine, trace.current).every((p) => p.solved))
    return { ok: true, state: trace.current };
  ensureAdvancedHolding(context);
  for (let step = 0; step < 4; step++) {
    const pairs = observeF2LPairs(engine, trace.current),
      count = pairs.filter((p) => p.solved).length;
    if (count === 4) return { ok: true, state: trace.current };
    const selected = chooseF2LCandidate(engine, trace.current);
    for (const input of selected.actions) {
      const before = trace.current,
        beforePairs = observeF2LPairs(engine, before),
        target = beforePairs.find((p) => p.cornerId === selected.target.cornerId)!;
      const after = engine.apply(before, input.moves),
        afterPairs = observeF2LPairs(engine, after);
      const insertion = input.ruleId === 'advanced-f2l-insert';
      const solvedBefore = beforePairs.filter((p) => p.solved).length,
        solvedAfter = afterPairs.filter((p) => p.solved).length;
      trace.append({
        ...input,
        pair: {
          cornerId: target.cornerId,
          edgeId: target.edgeId,
          slot: target.slot,
          phase: insertion ? 'insert' : 'prepare',
          ordinal: solvedBefore + 1,
          solvedBefore,
          solvedAfter,
        },
        ...(insertion
          ? {
              selection: {
                policyVersion: 'f2l-human-v2' as const,
                current: selected.metrics,
                next: selected.nextMetrics,
                compared: selected.compared,
              },
              explanation: `Selected for visible recognition and comfortable execution, then fewer moves and regrips with the next pair. ${input.explanation}`,
            }
          : {}),
        check: {
          id: insertion ? 'advanced-f2l-pair' : 'f2l-protected',
          description: insertion
            ? 'The selected pair is solved and all earlier work is restored.'
            : 'The cross and previously completed pairs are restored.',
          test: (s) =>
            preservesF2L(engine, before, s) &&
            (!insertion ||
              observeF2LPairs(engine, s).find((p) => p.cornerId === target.cornerId)!.solved),
        },
      });
    }
    if (observeF2LPairs(engine, trace.current).filter((p) => p.solved).length <= count)
      throw new RuleError('loop', 'advanced-f2l', 'An F2L selection made no pair progress.');
  }
  if (!observeF2LPairs(engine, trace.current).every((p) => p.solved))
    throw new RuleError('budget', 'advanced-f2l', 'F2L exceeded four pair insertions.');
  return { ok: true, state: trace.current };
}
