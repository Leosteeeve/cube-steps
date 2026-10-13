import type { StageResult } from '../contracts';
import type { CubeEngine, CubeState, TeachingMove } from '../../core/types';
import { ensureAdvancedHolding, type AdvancedContext } from './context';
import { checkAdvancedStage } from './stages';
import { recognizeAdvancedOLL } from './recognize-oll';
import { recognizeAdvancedPLL } from './recognize-pll';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
import { RuleError } from '../shared/trace';
import { describeCaseRecognition } from '../../algorithms/recognition-evidence';
export function advancedLastLayerTargets(engine: CubeEngine, state: CubeState): string[] {
  const o = engine.observe(state);
  return [...o.edges, ...o.corners]
    .filter((p) => Object.values(p.stickers).includes('yellow'))
    .map((p) => p.id);
}
export function advancedAufMoves(engine: CubeEngine, state: CubeState): TeachingMove[] | null {
  return (
    ([[], ['U'], ["U'"], ['U2']] as TeachingMove[][]).find((u) =>
      engine.isSolved(engine.apply(state, u)),
    ) ?? null
  );
}
function solveLastLayer(
  context: AdvancedContext,
  stage: 'advanced-oll' | 'advanced-pll',
): StageResult {
  const { engine, trace } = context;
  if (checkAdvancedStage(engine, trace.current, stage)) return { ok: true, state: trace.current };
  ensureAdvancedHolding(context);
  const match = (stage === 'advanced-oll' ? recognizeAdvancedOLL : recognizeAdvancedPLL)(
    engine,
    trace.current,
  );
  if (!match)
    throw new RuleError('verification', stage, 'An unfinished last layer has no recognized case.');
  const c = ALGORITHM_REGISTRY.cases[match.caseId],
    variant = ALGORITHM_REGISTRY.variants[match.variantId];
  if (match.setup.length)
    trace.append({
      kind: 'setup',
      ruleId: 'advanced-last-layer-setup',
      caseId: c.id,
      targets: advancedLastLayerTargets(engine, trace.current),
      moves: [...match.setup],
      recognition: describeCaseRecognition(engine, trace.current, c),
      explanation:
        'Turn the upper layer to match the formula holding pattern. Keep the first two layers complete.',
    });
  trace.append({
    kind: 'algorithm',
    ruleId: 'advanced-last-layer-formula',
    caseId: c.id,
    algorithmId: variant.id,
    targets: advancedLastLayerTargets(engine, trace.current),
    moves: [...variant.moves],
    recognition: variant.precondition,
    explanation: variant.effect,
    check: {
      id: stage,
      description: variant.effect,
      test: (s) => checkAdvancedStage(engine, s, stage),
    },
  });
  return { ok: true, state: trace.current };
}
export function solveAdvancedOLL(c: AdvancedContext): StageResult {
  return solveLastLayer(c, 'advanced-oll');
}
export function solveAdvancedPLL(c: AdvancedContext): StageResult {
  return solveLastLayer(c, 'advanced-pll');
}
export function solveAdvancedAUF(context: AdvancedContext): StageResult {
  const { engine, trace } = context;
  if (engine.isSolved(trace.current)) return { ok: true, state: trace.current };
  if (!checkAdvancedStage(engine, trace.current, 'advanced-pll'))
    throw new RuleError('verification', 'advanced-auf', 'Final alignment requires completed PLL.');
  ensureAdvancedHolding(context);
  const moves = advancedAufMoves(engine, trace.current);
  if (!moves?.length)
    throw new RuleError(
      'verification',
      'advanced-auf',
      'The final alignment did not match a U turn.',
    );
  trace.append({
    kind: 'setup',
    ruleId: 'advanced-auf',
    caseId: 'auf',
    targets: advancedLastLayerTargets(engine, trace.current),
    moves,
    recognition:
      'The last-layer pieces are in order but their side colors are offset from the centers.',
    explanation: 'Turn only the upper layer until every side color matches its center.',
    check: { id: 'advanced-auf', description: 'Every face is solved.', test: engine.isSolved },
  });
  return { ok: true, state: trace.current };
}
