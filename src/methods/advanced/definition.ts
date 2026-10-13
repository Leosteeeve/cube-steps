import type { MethodRuntime } from '../contracts';
import { ADVANCED_PRESENTATION } from './presentation';
import { checkAdvancedStage } from './stages';
import { canonicalHoldingMoves } from '../../core/holding-frame';
import { recognizeAdvancedOLL } from './recognize-oll';
import { recognizeAdvancedPLL } from './recognize-pll';
import { advancedAufMoves, advancedLastLayerTargets } from './last-layer';
import { observeF2LPairs, preservesF2L } from '../cfop/f2l-cases';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
import { f2lSignature } from './f2l/recognize';
import type { F2LTarget } from './f2l/types';
import type { CrossTable } from './cross/table';
import { extractCross, rankCross, CROSS_MOVES } from './cross/coordinates';
import { crossMoveEvidence } from './cross/solve';
import type { FaceMove } from '../../core/types';
import { describeCaseRecognition } from '../../algorithms/recognition-evidence';
const same = (a: readonly string[], b: readonly string[]) => a.join(' ') === b.join(' ');
// Cross validation requires the integrity-checked distance asset. The unbound
// runtime fails closed for cross actions and is sufficient for partial demos.
export function createAdvancedRuntime(table: CrossTable): MethodRuntime {
  return {
    ...ADVANCED_RUNTIME,
    checkAction(engine, action, stage) {
      if (stage !== 'advanced-cross' || action.ruleId === 'advanced-holding')
        return ADVANCED_RUNTIME.checkAction(engine, action, stage);
      if (
        action.ruleId !== 'advanced-cross-step' ||
        action.caseId !== 'shortest-cross' ||
        action.kind !== 'setup' ||
        action.moves.length !== 1 ||
        !CROSS_MOVES.includes(action.moves[0] as FaceMove) ||
        !engine.equals(engine.apply(action.before, action.moves), action.after)
      )
        return false;
      const before = table.distances[rankCross(extractCross(engine, action.before))],
        after = table.distances[rankCross(extractCross(engine, action.after))],
        evidence = crossMoveEvidence(engine, action.before, action.after);
      return (
        before >= 1 &&
        before <= 8 &&
        after === before - 1 &&
        action.cross?.distanceBefore === before &&
        action.cross.distanceAfter === after &&
        same(action.targets, evidence.targets) &&
        action.recognition === evidence.recognition &&
        action.explanation === evidence.explanation
      );
    },
  };
}
export const ADVANCED_RUNTIME: MethodRuntime = {
  presentation: ADVANCED_PRESENTATION,
  checkStage: checkAdvancedStage,
  checkAction(engine, action, stage) {
    if (!engine.equals(engine.apply(action.before, action.moves), action.after)) return false;
    if (action.ruleId === 'advanced-holding') {
      const c = engine.observe(action.after).centers;
      return (
        action.kind === 'regrip' &&
        action.caseId === 'white-down-green-front' &&
        action.targets.length === 0 &&
        !checkAdvancedStage(engine, action.before, stage) &&
        same(action.moves, canonicalHoldingMoves(engine, action.before)) &&
        c.D === 'white' &&
        c.F === 'green'
      );
    }
    if (stage === 'advanced-f2l') {
      const before = observeF2LPairs(engine, action.before),
        after = observeF2LPairs(engine, action.after),
        m = action.pair,
        pair = before.find((p) => p.cornerId === m?.cornerId);
      if (
        !m ||
        !pair ||
        pair.solved ||
        pair.edgeId !== m.edgeId ||
        pair.slot !== m.slot ||
        !same(action.targets, [pair.cornerId, pair.edgeId]) ||
        m.solvedBefore !== before.filter((p) => p.solved).length ||
        m.solvedAfter !== after.filter((p) => p.solved).length ||
        m.ordinal !== m.solvedBefore + 1 ||
        !preservesF2L(engine, action.before, action.after)
      )
        return false;
      if (action.ruleId === 'advanced-f2l-align')
        return (
          action.kind === 'setup' &&
          action.caseId === 'f2l-preparation' &&
          m.phase === 'prepare' &&
          action.moves.length === 1 &&
          /^U(?:2|')?$/.test(action.moves[0])
        );
      if (action.ruleId === 'advanced-f2l-extract') {
        const o = engine.observe(action.before),
          c = o.corners.find((p) => p.id === pair.cornerId)!,
          e = o.edges.find((p) => p.id === pair.edgeId)!;
        const wrongCorner =
          !c.slot.includes('U') && ![...pair.slot].every((f) => c.slot.includes(f));
        const occupied = wrongCorner ? c.slot.replace('D', '') : e.slot;
        const slot = ['FR', 'FL', 'BR', 'BL'].find(
          (s) => s.split('').sort().join('') === occupied.split('').sort().join(''),
        );
        const id = 'advanced-extract/' + slot?.toLowerCase() + '/toward',
          algorithm = ALGORITHM_REGISTRY.preparations[id];
        const next = engine.observe(action.after),
          lifted = wrongCorner
            ? next.corners.find((p) => p.id === pair.cornerId)!
            : next.edges.find((p) => p.id === pair.edgeId)!;
        return (
          !!algorithm &&
          action.kind === 'algorithm' &&
          m.phase === 'prepare' &&
          action.algorithmId === id &&
          action.caseId === 'f2l-extraction-' + slot!.toLowerCase() &&
          same(action.moves, algorithm.moves) &&
          lifted.slot.includes('U')
        );
      }
      const variant = ALGORITHM_REGISTRY.variants[action.algorithmId ?? ''],
        s = action.selection;
      return (
        action.ruleId === 'advanced-f2l-insert' &&
        action.kind === 'algorithm' &&
        m.phase === 'insert' &&
        !!variant &&
        variant.caseId === action.caseId &&
        variant.targetSlot === pair.slot &&
        variant.startSignature === f2lSignature(engine, action.before, pair as F2LTarget) &&
        same(variant.moves, action.moves) &&
        after.find((p) => p.cornerId === pair.cornerId)!.solved &&
        !!s &&
        s.policyVersion === 'f2l-v1' &&
        Number.isFinite(s.immediateCost) &&
        s.immediateCost >= 0 &&
        Number.isFinite(s.nextCost) &&
        s.nextCost >= 0 &&
        Number.isInteger(s.compared) &&
        s.compared >= 1 &&
        s.compared <= 32
      );
    }
    if (stage === 'advanced-auf')
      return (
        action.kind === 'setup' &&
        action.ruleId === 'advanced-auf' &&
        action.caseId === 'auf' &&
        !engine.isSolved(action.before) &&
        same(action.targets, advancedLastLayerTargets(engine, action.before)) &&
        same(action.moves, advancedAufMoves(engine, action.before) ?? []) &&
        engine.isSolved(action.after)
      );
    if (stage === 'advanced-oll' || stage === 'advanced-pll') {
      const match = (stage === 'advanced-oll' ? recognizeAdvancedOLL : recognizeAdvancedPLL)(
        engine,
        action.before,
      );
      if (
        !match ||
        action.caseId !== match.caseId ||
        !same(action.targets, advancedLastLayerTargets(engine, action.before))
      )
        return false;
      if (action.ruleId === 'advanced-last-layer-setup')
        return (
          action.kind === 'setup' &&
          match.setup.length > 0 &&
          same(action.moves, match.setup) &&
          action.recognition ===
            describeCaseRecognition(engine, action.before, ALGORITHM_REGISTRY.cases[match.caseId])
        );
      const variant = ALGORITHM_REGISTRY.variants[match.variantId];
      return (
        action.kind === 'algorithm' &&
        action.ruleId === 'advanced-last-layer-formula' &&
        action.algorithmId === match.variantId &&
        match.setup.length === 0 &&
        action.recognition === variant.precondition &&
        same(action.moves, variant.moves) &&
        checkAdvancedStage(engine, action.after, stage)
      );
    }
    return false;
  },
};
