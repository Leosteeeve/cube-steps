import type { StageResult } from '../contracts';
import { ensureWhiteDown, type CFOPContext } from './context';
import type { CFOPStageId, CubeEngine, CubeState, TeachingMove } from '../../core/types';
import { checkCFOPStage } from './stages';
import { recognizeLastLayer } from './cases';
import { CFOP_ALGORITHMS } from './catalog';
import { RuleError } from '../shared/trace';
import { U_SETUPS } from './f2l-cases';
export function lastLayerTargets(
  engine: CubeEngine,
  state: CubeState,
  stage: CFOPStageId,
): string[] {
  const o = engine.observe(state);
  return (
    stage.endsWith('edges')
      ? o.edges
      : stage.endsWith('corners')
        ? o.corners
        : [...o.edges, ...o.corners]
  )
    .filter((p) => p.slot.includes('U'))
    .map((p) => p.id);
}
function solveLook(c: CFOPContext, stage: CFOPStageId): StageResult {
  const { engine, trace } = c;
  if (checkCFOPStage(engine, trace.current, stage)) return { ok: true, state: trace.current };
  ensureWhiteDown(c);
  const match = recognizeLastLayer(engine, trace.current, stage);
  if (!match)
    throw new RuleError(
      'unsupported-case',
      stage,
      'No last-layer teaching case matched this state.',
    );
  for (const kind of ['regrip', 'setup'] as const) {
    const moves = match.setup.filter((m) =>
      kind === 'regrip' ? m.startsWith('y') : m.startsWith('U'),
    );
    if (moves.length)
      trace.append({
        kind,
        ruleId: 'cfop-last-layer-setup',
        caseId: match.caseId,
        targets: lastLayerTargets(engine, trace.current, stage),
        recognition: recognizeLastLayer(engine, trace.current, stage)!.recognition,
        explanation:
          kind === 'regrip'
            ? 'Rotate the whole cube to view the recognized case from the required side.'
            : 'Turn the upper layer to align the observed pattern with this formula. Final center alignment is checked separately.',
        moves,
      });
  }
  const algorithm = CFOP_ALGORITHMS[match.algorithmId];
  trace.append({
    kind: 'algorithm',
    ruleId: 'cfop-last-layer-formula',
    caseId: match.caseId,
    algorithmId: match.algorithmId,
    targets: lastLayerTargets(engine, trace.current, stage),
    recognition: recognizeLastLayer(engine, trace.current, stage)!.recognition,
    explanation: `${algorithm.name}. ${algorithm.effect} The lower layers may move during the formula; check them when the full formula finishes.`,
    moves: algorithm.moves,
    check: {
      id: stage,
      description: algorithm.effect,
      test: (state) => checkCFOPStage(engine, state, stage),
    },
  });
  return { ok: true, state: trace.current };
}
export const solveOLLEdges = (c: CFOPContext) => solveLook(c, 'cfop-oll-edges');
export const solveOLLCorners = (c: CFOPContext) => solveLook(c, 'cfop-oll-corners');
export const solvePLLCorners = (c: CFOPContext) => solveLook(c, 'cfop-pll-corners');
export const solvePLLEdges = (c: CFOPContext) => solveLook(c, 'cfop-pll-edges');
export function aufMoves(engine: CubeEngine, state: CubeState): TeachingMove[] | null {
  if (
    engine.observe(state).centers.D !== 'white' ||
    !checkCFOPStage(engine, state, 'cfop-pll-edges')
  )
    return null;
  return U_SETUPS.find((moves) => engine.isSolved(engine.apply(state, moves))) ?? null;
}
export function solveAUF(c: CFOPContext): StageResult {
  const { engine, trace } = c;
  if (engine.isSolved(trace.current)) return { ok: true, state: trace.current };
  ensureWhiteDown(c);
  const moves = aufMoves(engine, trace.current);
  if (!moves?.length)
    throw new RuleError(
      'unsupported-case',
      'cfop-auf',
      'The top layer is not ready for final alignment.',
    );
  trace.append({
    kind: 'setup',
    ruleId: 'cfop-auf',
    caseId: 'auf',
    targets: lastLayerTargets(engine, trace.current, 'cfop-auf'),
    recognition:
      'All top pieces have the correct relative order, but their side colors do not yet match the centers.',
    explanation:
      'AUF means adjust the upper face. Turn the whole top layer until all four side colors match their centers.',
    moves,
    check: {
      id: 'solved',
      description: 'All six faces match their centers.',
      test: engine.isSolved,
    },
  });
  return { ok: true, state: trace.current };
}
