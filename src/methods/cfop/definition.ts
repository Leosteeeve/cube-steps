import type { MethodRuntime } from '../contracts';
import { CFOP_PRESENTATION } from './presentation';
import { checkCFOPStage } from './stages';
import { whiteDownMoves } from './stages';
import { preservesCrossEdges, recognizeCross } from './cross-cases';
import { observeF2LPairs, preservesF2L, recognizeF2L, U_SETUPS } from './f2l-cases';
import { recognizeLastLayer } from './cases';
import { aufMoves, lastLayerTargets } from './last-layer';
import type { CFOPStageId } from '../../core/types';
export const CFOP_RUNTIME: MethodRuntime = {
  presentation: CFOP_PRESENTATION,
  checkStage: checkCFOPStage,
  checkAction(engine, action, stage) {
    if (action.ruleId === 'cfop-hold-white-down')
      return (
        action.kind === 'regrip' &&
        !checkCFOPStage(engine, action.before, stage) &&
        action.moves.join(' ') === whiteDownMoves(engine, action.before).join(' ') &&
        engine.observe(action.after).centers.D === 'white'
      );
    if (stage === 'cfop-cross') {
      const match = recognizeCross(engine, action.before, action.targets[0]);
      return (
        !!match &&
        action.targets.length === 1 &&
        action.ruleId === match.caseId &&
        action.caseId === match.caseId &&
        action.moves.join(' ') === match.moves.join(' ') &&
        action.kind === match.kind &&
        preservesCrossEdges(engine, action.before, action.after)
      );
    }
    if (stage === 'cfop-f2l') {
      const pairs = observeF2LPairs(engine, action.before),
        pair = pairs.find((p) => p.cornerId === action.pair?.cornerId);
      const next = observeF2LPairs(engine, action.after),
        metadata = action.pair;
      if (
        !pair ||
        !metadata ||
        pair.solved ||
        metadata.edgeId !== pair.edgeId ||
        metadata.slot !== pair.slot ||
        action.targets.join(' ') !== [pair.cornerId, pair.edgeId].join(' ') ||
        metadata.solvedBefore !== pairs.filter((p) => p.solved).length ||
        metadata.solvedAfter !== next.filter((p) => p.solved).length ||
        metadata.ordinal !== metadata.solvedBefore + 1 ||
        !preservesF2L(engine, action.before, action.after)
      )
        return false;
      if (action.ruleId === 'f2l-setup' && action.kind !== 'algorithm') {
        const match = recognizeF2L(engine, action.before, pair);
        const expected = match?.setup.filter((m) =>
          action.kind === 'regrip' ? m.startsWith('y') : m.startsWith('U'),
        );
        return (
          metadata.phase === 'prepare' &&
          match?.caseId === action.caseId &&
          expected?.join(' ') === action.moves.join(' ')
        );
      }
      if (action.ruleId !== 'f2l-maneuver' || action.kind !== 'algorithm') return false;
      // Reverse only a possible U preparation to check the finite observed case.
      // No candidate formula is run to choose a solution.
      const admitted = U_SETUPS.some((u) => {
        const source = engine.apply(action.before, u),
          match = recognizeF2L(engine, source, pair);
        return (
          !!match &&
          match.caseId === action.caseId &&
          match.algorithmId === action.algorithmId &&
          match.phase === metadata.phase &&
          engine.equals(engine.apply(source, match.setup), action.before)
        );
      });
      if (!admitted) return false;
      if (metadata.phase === 'insert')
        return next.find((p) => p.cornerId === pair.cornerId)!.solved;
      if (metadata.phase === 'pair') {
        const o = engine.observe(action.after),
          c = o.corners.find((p) => p.id === pair.cornerId)!,
          e = o.edges.find((p) => p.id === pair.edgeId)!;
        return (
          c.slot.includes('U') &&
          e.slot.includes('U') &&
          [...e.slot].every((f) => c.stickers[f as 'U'] === e.stickers[f as 'U'])
        );
      }
      return true;
    }
    if (stage === 'cfop-auf')
      return (
        action.ruleId === 'cfop-auf' &&
        action.caseId === 'auf' &&
        action.kind === 'setup' &&
        !engine.isSolved(action.before) &&
        action.moves.join(' ') === aufMoves(engine, action.before)?.join(' ') &&
        engine.isSolved(action.after)
      );
    if (
      ['cfop-oll-edges', 'cfop-oll-corners', 'cfop-pll-corners', 'cfop-pll-edges'].includes(stage)
    ) {
      const match = recognizeLastLayer(engine, action.before, stage as CFOPStageId);
      if (
        !match ||
        action.caseId !== match.caseId ||
        action.targets.join(' ') !==
          lastLayerTargets(engine, action.before, stage as CFOPStageId).join(' ')
      )
        return false;
      if (action.ruleId === 'cfop-last-layer-setup' && action.kind !== 'algorithm')
        return (
          action.moves.join(' ') ===
          match.setup
            .filter((m) => (action.kind === 'regrip' ? m.startsWith('y') : m.startsWith('U')))
            .join(' ')
        );
      return (
        action.kind === 'algorithm' &&
        action.ruleId === 'cfop-last-layer-formula' &&
        action.algorithmId === match.algorithmId &&
        match.setup.length === 0 &&
        checkCFOPStage(engine, action.after, stage)
      );
    }
    return false;
  },
};
