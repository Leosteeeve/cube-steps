import type { StageResult } from '../contracts';
import { ensureWhiteDown, type CFOPContext } from './context';
import {
  describeF2L,
  observeF2LPairs,
  preservesF2L,
  recognizeF2L,
  type F2LMatch,
} from './f2l-cases';
import { CFOP_ALGORITHMS } from './catalog';
import { RuleError } from '../shared/trace';
import type { TeachingMove, PairTrace } from '../../core/types';
export function solveCFOPF2L(c: CFOPContext): StageResult {
  const { engine, trace } = c;
  if (observeF2LPairs(engine, trace.current).every((p) => p.solved))
    return { ok: true, state: trace.current };
  ensureWhiteDown(c);
  for (const selected of observeF2LPairs(engine, trace.current)) {
    const seen = new Set<string>();
    for (let step = 0; step <= 32; step++) {
      const pairs = observeF2LPairs(engine, trace.current),
        pair = pairs.find((p) => p.cornerId === selected.cornerId)!;
      if (pair.solved) break;
      if (step === 32)
        throw new RuleError('budget', 'cfop-f2l', 'Pair preparation exceeded 32 maneuvers.');
      const match = recognizeF2L(engine, trace.current, pair);
      if (!match)
        throw new RuleError(
          'unsupported-case',
          'cfop-f2l',
          'No teaching case matched this corner-edge pair.',
        );
      const key = JSON.stringify([
        pair.cornerId,
        pair.edgeId,
        match.phase,
        pairs.filter((p) => p.solved).map((p) => p.cornerId),
        trace.current.data,
      ]);
      if (seen.has(key))
        throw new RuleError('loop', 'cfop-f2l', 'Pair preparation repeated without progress.');
      seen.add(key);
      const append = (
        moves: TeachingMove[],
        kind: 'regrip' | 'setup' | 'algorithm',
        phase: PairTrace['phase'],
        info: F2LMatch,
      ) => {
        if (!moves.length) return;
        const before = trace.current,
          currentPairs = observeF2LPairs(engine, before),
          current = currentPairs.find((p) => p.cornerId === pair.cornerId)!;
        const predicted = engine.apply(before, moves),
          solvedBefore = currentPairs.filter((p) => p.solved).length,
          solvedAfter = observeF2LPairs(engine, predicted).filter((p) => p.solved).length;
        trace.append({
          kind,
          ruleId: kind === 'algorithm' ? 'f2l-maneuver' : 'f2l-setup',
          caseId: info.caseId,
          targets: [pair.cornerId, pair.edgeId],
          recognition: describeF2L(engine.observe(before), current, info.caseId, phase),
          explanation:
            kind === 'regrip'
              ? 'Rotate the whole cube to bring the working slot to front-right; keep white down.'
              : kind === 'setup'
                ? 'Turn the upper layer to place the target pieces for the next maneuver. The cross and completed pairs remain in place.'
                : `${CFOP_ALGORITHMS[info.algorithmId].name}. ${phase === 'insert' ? 'Keep the matching block together as it enters its slot.' : phase === 'pair' ? 'The two pieces join into a matching block on top.' : 'Restore the open slot after arranging the two target pieces.'}`,
          moves,
          ...(kind === 'algorithm' ? { algorithmId: info.algorithmId } : {}),
          pair: {
            cornerId: pair.cornerId,
            edgeId: pair.edgeId,
            slot: current.slot,
            phase,
            ordinal: solvedBefore + 1,
            solvedBefore,
            solvedAfter,
          },
          check: {
            id: 'f2l-protected',
            description:
              'The cross and previously solved pairs are restored at this maneuver boundary.',
            test: (s) => preservesF2L(engine, before, s),
          },
        });
      };
      append(
        match.setup.filter((m) => m.startsWith('y')),
        'regrip',
        'prepare',
        match,
      );
      append(
        match.setup.filter((m) => m.startsWith('U')),
        'setup',
        'prepare',
        match,
      );
      append(CFOP_ALGORITHMS[match.algorithmId].moves, 'algorithm', match.phase, match);
    }
  }
  return { ok: true, state: trace.current };
}
