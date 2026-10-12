import type { MethodRuntime } from '../contracts';
import { CFOP_PRESENTATION } from './presentation';
import { checkCFOPStage } from './stages';
import { whiteDownMoves } from './stages';
import { preservesCrossEdges, recognizeCross } from './cross-cases';
export const CFOP_RUNTIME: MethodRuntime = {
  presentation: CFOP_PRESENTATION, checkStage: checkCFOPStage,
  checkAction(engine, action, stage) {
    if (action.ruleId === 'cfop-hold-white-down') return action.kind === 'regrip' && !checkCFOPStage(engine, action.before, stage) && action.moves.join(' ') === whiteDownMoves(engine, action.before).join(' ') && engine.observe(action.after).centers.D === 'white';
    if (stage === 'cfop-cross') {
      const match = recognizeCross(engine, action.before, action.targets[0]);
      return !!match && action.targets.length === 1 && action.ruleId === match.caseId && action.caseId === match.caseId && action.moves.join(' ') === match.moves.join(' ') && action.kind === match.kind && preservesCrossEdges(engine, action.before, action.after);
    }
    return false;
  },
};
